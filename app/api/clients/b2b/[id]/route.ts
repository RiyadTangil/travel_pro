import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

// GET - Fetch single B2B client with associated B2C clients
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Get company ID from header (set by middleware for company role)
    const companyId = request.headers.get('x-company-id')
    
    const { id } = params

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid client ID" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("manage_agency")
    const b2bClients = db.collection("b2b_clients")
    const b2cClients = db.collection("b2c_clients")

    // Build query with company filtering
    const query: any = { _id: new ObjectId(id) }
    
    // Filter by company ID if present (for company role)
    if (companyId) {
      query.companyId = companyId
    }

    console.log("B2B client query:", query);
    
    const clientData = await b2bClients.findOne(query)

    if (!clientData) {
      return NextResponse.json({ error: "Client not found or access denied" }, { status: 404 })
    }

    // Get associated B2C clients - also filter by company ID
    const b2cQuery: any = { associatedB2BId: id };
    if (companyId) {
      b2cQuery.companyId = companyId;
    }
    
    const associatedB2CClients = await b2cClients.find(b2cQuery).toArray()

    return NextResponse.json({
      client: clientData,
      associatedB2CClients,
    })
  } catch (error) {
    console.error("Error fetching B2B client:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Update B2B client
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Get company ID from header (set by middleware for company role)
    const companyId = request.headers.get('x-company-id')
    
    const { id } = params
    const data = await request.json()

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid client ID" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("manage_agency")
    const b2bClients = db.collection("b2b_clients")

    // Build query with company filtering
    const query: any = { _id: new ObjectId(id) }
    
    // Filter by company ID if present (for company role)
    if (companyId) {
      query.companyId = companyId
    }
    
    // First check if client exists and belongs to this company
    const existingClient = await b2bClients.findOne(query)
    if (!existingClient) {
      return NextResponse.json({ error: "Client not found or access denied" }, { status: 404 })
    }

    // Parse balance if provided
    if (data.balance !== undefined) {
      data.balance = Number.parseFloat(data.balance) || 0
    }

    data.updatedAt = new Date()
    
    // Ensure we don't change the companyId
    if (companyId) {
      data.companyId = companyId;
    }

    // Update with company-filtered query
    const result = await b2bClients.updateOne(query, { $set: data })

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Client not found or access denied" }, { status: 404 })
    }

    return NextResponse.json({ message: "Client updated successfully" })
  } catch (error) {
    console.error("Error updating B2B client:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Delete B2B client
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Get company ID from header (set by middleware for company role)
    const companyId = request.headers.get('x-company-id')
    
    const { id } = params

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid client ID" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("manage_agency")
    const b2bClients = db.collection("b2b_clients")
    const b2cClients = db.collection("b2c_clients")

    // Build query with company filtering
    const query: any = { _id: new ObjectId(id) }
    
    // Filter by company ID if present (for company role)
    if (companyId) {
      query.companyId = companyId
    }
    
    // First check if client exists and belongs to this company
    const existingClient = await b2bClients.findOne(query)
    if (!existingClient) {
      return NextResponse.json({ error: "Client not found or access denied" }, { status: 404 })
    }

    // Check if there are associated B2C clients
    const b2cQuery: any = { associatedB2BId: id };
    if (companyId) {
      b2cQuery.companyId = companyId;
    }
    
    const associatedClients = await b2cClients.countDocuments(b2cQuery)
    if (associatedClients > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete B2B client with associated B2C clients. Please remove or reassign B2C clients first.",
        },
        { status: 400 },
      )
    }

    const result = await b2bClients.deleteOne(query)

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Client not found or access denied" }, { status: 404 })
    }

    return NextResponse.json({ message: "Client deleted successfully" })
  } catch (error) {
    console.error("Error deleting B2B client:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
