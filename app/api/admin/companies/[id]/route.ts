import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// Hardcode the secret as a temporary workaround
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "your_secret_key";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Verify the user with JWT token
    const token = await getToken({ 
      req: request,
      secret: NEXTAUTH_SECRET
    });
    
    console.log("API token:", token);

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is an admin
    if (token.role !== "admin") {
      console.log(`Forbidden: User role is ${token.role}, not admin`);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = params;

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid company ID" }, { status: 400 });
    }

    // Connect to the database
    const client = await clientPromise;
    const db = client.db("manage_agency");
    const companies = db.collection("companies");
    const b2bClients = db.collection("b2b_clients");
    const b2cClients = db.collection("b2c_clients");
    const transactions = db.collection("transactions");

    // Get company by ID
    const company = await companies.findOne({ _id: new ObjectId(id) });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Get detailed client counts
    const b2bCount = await b2bClients.countDocuments({ companyId: id });
    const b2cCount = await b2cClients.countDocuments({ companyId: id });
    
    // Get recent clients (last 10)
    const recentB2BClients = await b2bClients
      .find({ companyId: id })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();
      
    const recentB2CClients = await b2cClients
      .find({ companyId: id })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    // Get transaction statistics
    const transactionStats = await transactions.aggregate([
      { $match: { companyId: id } },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          avgAmount: { $avg: "$amount" }
        }
      }
    ]).toArray();

    // Get monthly transaction data for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTransactions = await transactions.aggregate([
      { 
        $match: { 
          companyId: id,
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          count: { $sum: 1 },
          amount: { $sum: "$amount" }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]).toArray();

    // Get client status distribution
    const clientStatusDistribution = await b2cClients.aggregate([
      { $match: { companyId: id } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    const companyDetails = {
      ...company,
      clientsCount: {
        b2b: b2bCount,
        b2c: b2cCount,
        total: b2bCount + b2cCount
      },
      recentClients: {
        b2b: recentB2BClients,
        b2c: recentB2CClients
      },
      transactionStats: transactionStats[0] || {
        totalTransactions: 0,
        totalAmount: 0,
        avgAmount: 0
      },
      monthlyTransactions,
      clientStatusDistribution
    };

    return NextResponse.json({ company: companyDetails });
  } catch (error) {
    console.error("Error fetching company details:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}