import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

// GET - Fetch all B2B clients
export async function GET(request: NextRequest) {
  try {
    // Get company ID from header (set by middleware for company role)
    const companyId = request.headers.get('x-company-id')
    
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const search = searchParams.get("search") || ""

    const client = await clientPromise
    const db = client.db("manage_agency")
    const b2bClients = db.collection("b2b_clients")

    // Build filter query
    const filter: any = {}
    
    // Add company ID filter if available (for company role)
    if (companyId) {
      filter.companyId = companyId
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { businessType: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ]
    }

    console.log("B2B filter query:", filter)

    // Get total count for pagination
    const total = await b2bClients.countDocuments(filter)

    // Get clients with pagination
    const clients = await b2bClients
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray()

    return NextResponse.json({
      clients,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching B2B clients:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Create new B2B client
export async function POST(request: NextRequest) {
  try {
    // Get company ID from header (set by middleware for company role)
    const companyId = request.headers.get('x-company-id')
    
    const data = await request.json()

    const { name, email, phone, address, businessType, balance, notes } = data

    // Validate required fields
    if (!name || !email || !businessType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("manage_agency")
    const b2bClients = db.collection("b2b_clients")

    // Check if business name already exists for this company
    const existingQuery = { name }
    if (companyId) {
      existingQuery.companyId = companyId
    }
    const existingClient = await b2bClients.findOne(existingQuery)
    if (existingClient) {
      return NextResponse.json({ error: "Business with this name already exists" }, { status: 400 })
    }

    // Parse balance amount
    const balanceNum = Number.parseFloat(balance) || 0

    // Create client object
    const newClient = {
      name,
      email,
      phone,
      address,
      businessType,
      clientCategory: "B2B",
      // Add company ID to create proper association
      companyId: companyId || null,
      balance: balanceNum,
      notes: notes || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await b2bClients.insertOne(newClient)

    return NextResponse.json({
      message: "B2B client created successfully",
      clientId: result.insertedId,
      client: { ...newClient, _id: result.insertedId },
    })
  } catch (error) {
    console.error("Error creating B2B client:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
