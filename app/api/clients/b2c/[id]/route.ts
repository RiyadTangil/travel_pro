import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

// GET - Fetch single B2C client
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
    const b2cClients = db.collection("b2c_clients")

    // Build query with company filtering
    const query: any = { _id: new ObjectId(id) }
    
    // Filter by company ID if present (for company role)
    if (companyId) {
      query.companyId = companyId
    }

    console.log("B2C client query:", query);
    
    const clientData = await b2cClients.findOne(query)

    if (!clientData) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    return NextResponse.json({ client: clientData })
  } catch (error) {
    console.error("Error fetching B2C client:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Update B2C client
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
    const b2cClients = db.collection("b2c_clients")

    // Build query with company filtering
    const query: any = { _id: new ObjectId(id) }
    
    // Filter by company ID if present (for company role)
    if (companyId) {
      query.companyId = companyId
    }
    
    // First check if client exists and belongs to this company
    const existingClient = await b2cClients.findOne(query)
    if (!existingClient) {
      return NextResponse.json({ error: "Client not found or access denied" }, { status: 404 })
    }

    // Prevent modification of contract amount and initial payment
    if (data.contractAmount !== undefined) {
      return NextResponse.json({ 
        error: "Contract amount cannot be modified after creation",
        code: "CONTRACT_AMOUNT_IMMUTABLE"
      }, { status: 400 })
    }
    
    if (data.initialPayment !== undefined) {
      return NextResponse.json({ 
        error: "Initial payment cannot be modified after creation",
        code: "INITIAL_PAYMENT_IMMUTABLE"
      }, { status: 400 })
    }

    // Update status history if status changed
    if (data.status && existingClient.status !== data.status) {
        const newStatusEntry = {
          status: data.status,
          date: new Date().toISOString().split("T")[0],
          notes: data.statusNotes || `Status updated to ${data.status}`,
        }
      data.statusHistory = [...(existingClient.statusHistory || []), newStatusEntry]
    }

    data.updatedAt = new Date()

    // Ensure we don't change the companyId
    if (companyId) {
      data.companyId = companyId;
    }

    // Update the client with filtered query
    const result = await b2cClients.updateOne(query, { $set: data })

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Client not found or access denied" }, { status: 404 })
    }

    return NextResponse.json({ message: "Client updated successfully" })
  } catch (error) {
    console.error("Error updating B2C client:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Archive B2C client (replaced actual deletion)
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
    const b2cClients = db.collection("b2c_clients")
    const transactions = db.collection("transactions")

    // Build query with company filtering
    const query: any = { _id: new ObjectId(id) }
    
    // Filter by company ID if present (for company role)
    if (companyId) {
      query.companyId = companyId
    }

    // First check if the client has any transactions
    const transactionCount = await transactions.countDocuments({ clientId: id });
    
    // Set archived status instead of deleting
    const result = await b2cClients.updateOne(query, { 
      $set: { 
        isArchived: true,
        archivedAt: new Date(),
        archivedReason: "User requested archival",
        hadTransactions: transactionCount > 0,
        updatedAt: new Date()
      } 
    });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Client not found or access denied" }, { status: 404 })
    }

    return NextResponse.json({ 
      message: "Client archived successfully",
      hadTransactions: transactionCount > 0
    })
  } catch (error) {
    console.error("Error archiving B2C client:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
