import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    // Get the session to verify the user
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db("manage_agency");
    
    // Get collections
    const b2cClients = db.collection("b2c_clients");
    const b2bClients = db.collection("b2b_clients");

    // Build filter for company users
    let filter = {};
    if (session.user?.role === "company" && session.user?.companyId) {
      filter = { companyId: session.user.companyId };
    }

    // Get total clients count
    const totalB2CClients = await b2cClients.countDocuments({
      ...filter,
      $or: [{ isArchived: { $exists: false } }, { isArchived: false }]
    });
    
    const totalB2BClients = await b2bClients.countDocuments({
      ...filter,
      $or: [{ isArchived: { $exists: false } }, { isArchived: false }]
    });

    const totalClients = totalB2CClients + totalB2BClients;

    // Get active files count (B2C clients that are not completed)
    const activeFiles = await b2cClients.countDocuments({
      ...filter,
      status: { $ne: "completed" },
      $or: [{ isArchived: { $exists: false } }, { isArchived: false }]
    });

    // Get all B2C clients for revenue calculations
    const allB2CClients = await b2cClients.find({
      ...filter,
      $or: [{ isArchived: { $exists: false } }, { isArchived: false }]
    }).toArray();

    const allB2BClients = await b2bClients.find({
      ...filter,
      $or: [{ isArchived: { $exists: false } }, { isArchived: false }]
    }).toArray();

    // Calculate total revenue and pending payments
    let totalRevenue = 0;
    let pendingPayments = 0;

    // Calculate for B2C clients
    allB2CClients.forEach(client => {
      const contractAmount = client.contractAmount || 0;
      const dueAmount = client.dueAmount || 0;
      const paidAmount = contractAmount - dueAmount;
      
      totalRevenue += paidAmount;
      pendingPayments += dueAmount;
    });

    // Calculate for B2B clients
    allB2BClients.forEach(client => {
      const contractAmount = client.contractAmount || 0;
      const dueAmount = client.dueAmount || 0;
      const paidAmount = contractAmount - dueAmount;
      
      totalRevenue += paidAmount;
      pendingPayments += dueAmount;
    });

    // Get recent clients (last 5 B2C clients)
    const recentClients = await b2cClients.find({
      ...filter,
      $or: [{ isArchived: { $exists: false } }, { isArchived: false }]
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .toArray();

    // Calculate monthly growth (simplified - comparing last 30 days to previous 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const recentClientsCount = await b2cClients.countDocuments({
      ...filter,
      createdAt: { $gte: thirtyDaysAgo },
      $or: [{ isArchived: { $exists: false } }, { isArchived: false }]
    });

    const previousClientsCount = await b2cClients.countDocuments({
      ...filter,
      createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
      $or: [{ isArchived: { $exists: false } }, { isArchived: false }]
    });

    const clientGrowth = recentClientsCount - previousClientsCount;

    // Get recent active files count for growth calculation
    const recentActiveFiles = await b2cClients.countDocuments({
      ...filter,
      status: { $ne: "completed" },
      createdAt: { $gte: thirtyDaysAgo },
      $or: [{ isArchived: { $exists: false } }, { isArchived: false }]
    });

    const previousActiveFiles = await b2cClients.countDocuments({
      ...filter,
      status: { $ne: "completed" },
      createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
      $or: [{ isArchived: { $exists: false } }, { isArchived: false }]
    });

    const activeFilesGrowth = recentActiveFiles - previousActiveFiles;

    // Count clients with pending payments
    const clientsWithDues = allB2CClients.filter(client => (client.dueAmount || 0) > 0).length + 
                            allB2BClients.filter(client => (client.dueAmount || 0) > 0).length;

    const dashboardData = {
      totalClients,
      activeFiles,
      totalRevenue,
      pendingPayments,
      recentClients: recentClients.map(client => ({
        id: client._id,
        name: client.name,
        destination: client.destination,
        clientType: client.clientType,
        registrationDate: client.createdAt,
        status: client.status,
        contractAmount: client.contractAmount || 0
      })),
      growth: {
        clients: clientGrowth,
        activeFiles: activeFilesGrowth,
        clientsWithDues
      }
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
