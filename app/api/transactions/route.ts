import { type NextRequest, NextResponse } from "next/server"
import { TransactionService } from "@/lib/services/TransactionService"
import { TransactionError } from "@/lib/errors/TransactionError"

const transactionService = new TransactionService()

// GET - Fetch transactions for a specific client
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get("clientId")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")

    if (!clientId) {
      return NextResponse.json({ error: "Client ID is required" }, { status: 400 })
    }

    const result = await transactionService.getTransactionsForClient(clientId, page, limit)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching transactions:", error)
    
    if (error instanceof TransactionError) {
      return NextResponse.json({ 
        error: error.message,
        code: error.code,
        details: error.details 
      }, { status: error.statusCode })
    }
    
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Create new transaction
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    const { clientId, clientName, date, receivedAmount, refundAmount, notes, transactionType } = data

    // Validate required fields
    if (!clientId || !clientName || !date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const result = await transactionService.createTransaction({
      clientId,
      clientName,
      date,
      receivedAmount: Number.parseFloat(receivedAmount) || 0,
      refundAmount: Number.parseFloat(refundAmount) || 0,
      notes: notes || "",
      transactionType: transactionType || "B2C"
    })

    return NextResponse.json({
      message: "Transaction created successfully",
      transactionId: result.transactionId,
      transaction: result.transaction,
      oldDueAmount: result.oldDueAmount,
      newDueAmount: result.newDueAmount
    })
  } catch (error) {
    console.error("Error creating transaction:", error)
    
    if (error instanceof TransactionError) {
      return NextResponse.json({ 
        error: error.message,
        code: error.code,
        details: error.details 
      }, { status: error.statusCode })
    }
    
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
