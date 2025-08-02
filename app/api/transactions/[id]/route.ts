import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { TransactionService } from "@/lib/services/TransactionService"
import { TransactionError } from "@/lib/errors/TransactionError"

const transactionService = new TransactionService()

// GET - Fetch single transaction
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid transaction ID" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("manage_agency")
    const transactions = db.collection("transactions")

    const transaction = await transactions.findOne({ _id: new ObjectId(id) })

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    return NextResponse.json({ transaction })
  } catch (error) {
    console.error("Error fetching transaction:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Update transaction
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const data = await request.json()

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid transaction ID" }, { status: 400 })
    }

    const result = await transactionService.updateTransaction(id, data)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error updating transaction:", error)
    
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

// DELETE - Delete transaction
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid transaction ID" }, { status: 400 })
    }

    const result = await transactionService.deleteTransaction(id)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error deleting transaction:", error)
    
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
