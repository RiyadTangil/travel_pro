import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

// GET - Fetch direct transactions for a B2B client
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get("clientId")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")

    if (!clientId || !ObjectId.isValid(clientId)) {
      return NextResponse.json({ error: "Valid client ID is required" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("manage_agency")
    const directTransactions = db.collection("direct_transactions")

    // Build filter query
    const filter = { b2bClientId: clientId }

    // Get total count for pagination
    const total = await directTransactions.countDocuments(filter)

    // Get transactions with pagination
    const transactions = await directTransactions
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray()

    return NextResponse.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching direct transactions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Create new direct transaction
export async function POST(request: NextRequest) {
  const session = await (await clientPromise).startSession()
  
  try {
    const data = await request.json()
    const { clientId, type, amount, description, reference } = data

    // Validate required fields
    if (!clientId || !type || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!ObjectId.isValid(clientId)) {
      return NextResponse.json({ error: "Invalid client ID" }, { status: 400 })
    }

    if (!['CASH_IN', 'CASH_OUT'].includes(type)) {
      return NextResponse.json({ error: "Transaction type must be 'CASH_IN' or 'CASH_OUT'" }, { status: 400 })
    }

    const amountNum = Number.parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("manage_agency")
    const b2bClients = db.collection("b2b_clients")
    const directTransactions = db.collection("direct_transactions")

    // Start transaction
    await session.withTransaction(async () => {
      // Check if B2B client exists
      const b2bClient = await b2bClients.findOne(
        { _id: new ObjectId(clientId) },
        { session }
      )
      
      if (!b2bClient) {
        throw new Error("B2B client not found")
      }

      // Calculate balance change
      const balanceChange = type === 'CASH_IN' ? amountNum : -amountNum
      const newBalance = (b2bClient.balance || 0) + balanceChange

      // Create transaction record
      const newTransaction = {
        b2bClientId: clientId,
        type,
        amount: amountNum,
        description: description || "",
        reference: reference || "",
        balanceChange,
        previousBalance: b2bClient.balance || 0,
        newBalance,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const transactionResult = await directTransactions.insertOne(newTransaction, { session })

      // Update B2B client balance
      await b2bClients.updateOne(
        { _id: new ObjectId(clientId) },
        { 
          $set: { 
            balance: newBalance,
            updatedAt: new Date()
          } 
        },
        { session }
      )

      return {
        message: "Direct transaction created successfully",
        transactionId: transactionResult.insertedId,
        transaction: { ...newTransaction, _id: transactionResult.insertedId },
        newBalance
      }
    })

    return NextResponse.json({
      message: "Direct transaction created successfully"
    })
  } catch (error) {
    console.error("Error creating direct transaction:", error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Internal server error" 
    }, { status: 500 })
  } finally {
    await session.endSession()
  }
}