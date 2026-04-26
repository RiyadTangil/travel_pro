import { MONGODB_DB_NAME } from "@/lib/database-config"
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET(request: Request) {
  try {
    // Get the session to verify the user
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    const reportType = searchParams.get("type") || "clients";
    const dateRange = searchParams.get("range") || "last30days";
    const clientType = searchParams.get("clientType") || "all";
    const includeArchived = searchParams.get("includeArchived") === "true";
    
    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db(MONGODB_DB_NAME);
    const b2cCollection = db.collection("b2c_clients");
    const b2bCollection = db.collection("b2b_clients");

    // Prepare filters
    const filter: any = {};
    
    // Add company filter for tenant isolation if user is from a company
    if (session.user?.role === "company" && session.user?.companyId) {
      filter.companyId = session.user.companyId;
    }
    
    // Handle archived filter
    if (!includeArchived) {
      // If we already have $or for company filtering
      if (filter.$or) {
        filter.$and = [
          { $or: filter.$or },
          { $or: [{ isArchived: { $exists: false } }, { isArchived: false }] }
        ];
        delete filter.$or;
      } else {
        filter.$or = [
          { isArchived: { $exists: false } }, 
          { isArchived: false }
        ];
      }
    }

    // Calculate date range
    let startDate = new Date();
    if (dateRange === "last7days") {
      startDate.setDate(startDate.getDate() - 7);
    } else if (dateRange === "last30days") {
      startDate.setDate(startDate.getDate() - 30);
    } else if (dateRange === "thisMonth") {
      startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    } else if (dateRange === "lastMonth") {
      startDate = new Date(startDate.getFullYear(), startDate.getMonth() - 1, 1);
    }
    
    filter.createdAt = { $gte: startDate };

    // Get clients based on user role and filters
    let clients = [];
    
    // For regular users, don't return any clients
    if (session.user.role === "user") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }
    
    // Get B2C clients if needed
    if (clientType === "all" || clientType === "b2c") {
      const b2cClients = await b2cCollection.find(filter).toArray();
      clients.push(...b2cClients.map(client => ({ ...client, type: "B2C" })));
    }
    
    // Get B2B clients if needed
    if (clientType === "all" || clientType === "b2b") {
      const b2bClients = await b2bCollection.find(filter).toArray();
      clients.push(...b2bClients.map(client => ({ ...client, type: "B2B" })));
    }

    // Process client data for the report
    const calculatePaidAndDue = (client) => {
      // If transactions exist, use them
      if (client.payments && Array.isArray(client.payments)) {
        const paid = client.payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
        const due = (client.contractAmount || 0) - paid;
        return { paid, due: due > 0 ? due : 0 };
      } else {
        // Use contractAmount and dueAmount if available
        return {
          paid: (client.contractAmount || 0) - (client.dueAmount || 0),
          due: client.dueAmount || 0
        };
      }
    };

    const reportData = {
      summary: {
        totalClients: clients.length,
        activeClients: clients.filter(c => !c.isArchived).length,
        archivedClients: clients.filter(c => c.isArchived).length,
        b2cClients: clients.filter(c => c.type === "B2C").length,
        b2bClients: clients.filter(c => c.type === "B2B").length,
      },
      financial: {
        totalPaid: clients.reduce((sum, client) => {
          const { paid } = calculatePaidAndDue(client);
          return sum + paid;
        }, 0),
        totalDue: clients.reduce((sum, client) => {
          const { due } = calculatePaidAndDue(client);
          return sum + due;
        }, 0),
      },
      statusDistribution: {
        "file-ready": clients.filter(c => c.status === "file-ready").length,
        "medical": clients.filter(c => c.status === "medical").length,
        "mofa": clients.filter(c => c.status === "mofa").length,
        "visa-stamping": clients.filter(c => c.status === "visa-stamping").length,
        "manpower": clients.filter(c => c.status === "manpower").length,
        "flight-ticket": clients.filter(c => c.status === "flight-ticket").length,
        "completed": clients.filter(c => c.status === "completed").length,
      },
      clients: clients.map(client => {
        const { paid, due } = calculatePaidAndDue(client);
        
        return {
          id: client._id,
          name: client.name,
          passport: client.passportNumber,
          phone: client.phone,
          type: client.type,
          status: client.status,
          created: client.createdAt,
          totalPaid: paid,
          totalDue: due,
          archived: client.isArchived || false,
        };
      }),
    };

    return NextResponse.json(reportData);
  } catch (error) {
    console.error("[REPORTS_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 