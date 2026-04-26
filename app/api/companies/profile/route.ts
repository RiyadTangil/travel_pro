import { MONGODB_DB_NAME } from "@/lib/database-config"
import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// Hardcode the secret as a temporary workaround
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "your_secret_key";

// GET - Fetch the profile of the currently logged in company
export async function GET(request: NextRequest) {
  try {
    // Get token from the request
    const token = await getToken({ 
      req: request,
      secret: NEXTAUTH_SECRET
    });
    
    // Check if user is authenticated and is a company
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify role is company
    if (token.role !== "company") {
      return NextResponse.json({ error: "Forbidden. Only company accounts can access this endpoint" }, { status: 403 });
    }

    // Get company ID from token
    const companyId = token.companyId;
    if (!companyId) {
      return NextResponse.json({ error: "Company ID not found in token" }, { status: 400 });
    }

    // Connect to the database
    const client = await clientPromise;
    const db = client.db(MONGODB_DB_NAME);
    const companies = db.collection("companies");

    // Find company by ID
    const company = await companies.findOne({ _id: new ObjectId(companyId.toString()) });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Get client counts for the company
    const b2bClients = db.collection("b2b_clients");
    const b2cClients = db.collection("b2c_clients");
    
    const b2bCount = await b2bClients.countDocuments({ companyId: companyId.toString() });
    const b2cCount = await b2cClients.countDocuments({ companyId: companyId.toString() });
    
    const companyWithStats = {
      ...company,
      clientsCount: {
        b2b: b2bCount,
        b2c: b2cCount,
        total: b2bCount + b2cCount
      }
    };

    return NextResponse.json({ company: companyWithStats });
  } catch (error) {
    console.error("Error fetching company profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH - Update company profile
export async function PATCH(request: NextRequest) {
  try {
    // Get token from the request
    const token = await getToken({ 
      req: request,
      secret: NEXTAUTH_SECRET
    });
    
    // Check if user is authenticated and is a company
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify role is company
    if (token.role !== "company") {
      return NextResponse.json({ error: "Forbidden. Only company accounts can access this endpoint" }, { status: 403 });
    }

    // Get company ID from token
    const companyId = token.companyId;
    if (!companyId) {
      return NextResponse.json({ error: "Company ID not found in token" }, { status: 400 });
    }

    // Get update data from request
    const data = await request.json();

    // Fields that can be updated by the company
    const allowedFields = ['name', 'email', 'mobileNumber', 'address', 'logoUrl', 'businessType'];
    
    // Filter to only allowed fields
    const updateData: Record<string, any> = {};
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    }

    // Add updated timestamp
    updateData.updatedAt = new Date();

    // Connect to the database
    const client = await clientPromise;
    const db = client.db(MONGODB_DB_NAME);
    const companies = db.collection("companies");

    // Update company
    const result = await companies.updateOne(
      { _id: new ObjectId(companyId.toString()) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json({ 
      message: "Company profile updated successfully",
      updated: updateData
    });
  } catch (error) {
    console.error("Error updating company profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 