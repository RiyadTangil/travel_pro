import { MONGODB_DB_NAME } from "@/lib/database-config"
import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import clientPromise from "@/lib/mongodb";

// Hardcode the secret as a temporary workaround
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "your_secret_key";

export async function GET(request: NextRequest) {
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

    // Connect to the database
    const client = await clientPromise;
    const db = client.db(MONGODB_DB_NAME);
    const companies = db.collection("companies");
    const b2bClients = db.collection("b2b_clients");
    const b2cClients = db.collection("b2c_clients");

    // Get all companies
    const allCompanies = await companies.find().sort({ createdAt: -1 }).toArray();

    // Get client counts for each company
    const companiesWithCounts = await Promise.all(
      allCompanies.map(async (company) => {
        const companyId = company._id;
        
        // Count B2B clients
        const b2bCount = await b2bClients.countDocuments({ companyId });
        
        // Count B2C clients
        const b2cCount = await b2cClients.countDocuments({ companyId });
        
        // Calculate total clients
        const clientsCount = b2bCount + b2cCount;
        
        return {
          ...company,
          clientsCount
        };
      })
    );

    return NextResponse.json({
      companies: companiesWithCounts
    });
  } catch (error) {
    console.error("Error fetching companies:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 