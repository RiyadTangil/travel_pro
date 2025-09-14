import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

// GET - Fetch single direct transaction
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid transaction ID" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("manage_agency")
    const directTransactions = db.collection("direct_transactions")

    const transaction = await directTransactions.findOne({ _id: new ObjectId(id) })

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    return NextResponse.json({ transaction })
  } catch (error) {
    console.error("Error fetching direct transaction:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Update direct transaction
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await (await clientPromise).startSession()
  
  try {
    const { id } = params
    const data = await request.json()

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid transaction ID" }, { status: 400 })
    }

    const { type, amount, description, reference } = data

    if (type && !['cash_in', 'cash_out'].includes(type)) {
      return NextResponse.json({ error: "Transaction type must be 'cash_in' or 'cash_out'" }, { status: 400 })
    }

    if (amount !== undefined) {
      const amountNum = Number.parseFloat(amount)
      if (isNaN(amountNum) || amountNum <= 0) {
        return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 })
      }
    }

    const client = await clientPromise
    const db = client.db("manage_agency")
    const b2bClients = db.collection("b2b_clients")
    const directTransactions = db.collection("direct_transactions")

    await session.withTransaction(async () => {
      // Get existing transaction
      const existingTransaction = await directTransactions.findOne(
        { _id: new ObjectId(id) },
        { session }
      )
      
      if (!existingTransaction) {
        throw new Error("Transaction not found")
      }

      // Get B2B client
      const b2bClient = await b2bClients.findOne(
        { _id: new ObjectId(existingTransaction.b2bClientId) },
        { session }
      )
      
      if (!b2bClient) {
        throw new Error("Associated B2B client not found")
      }

      // Calculate new values
      const newType = type || existingTransaction.type
      const newAmount = amount !== undefined ? Number.parseFloat(amount) : existingTransaction.amount
      
      // Reverse old transaction effect on balance
      const oldBalanceChange = existingTransaction.balanceChange
      const currentBalance = b2bClient.balance - oldBalanceChange
      
      // Apply new transaction effect
      const newBalanceChange = newType === 'cash_in' ? newAmount : -newAmount
      const newBalance = currentBalance + newBalanceChange

      // Update transaction
      const updateData = {
        type: newType,
        amount: newAmount,
        description: description !== undefined ? description : existingTransaction.description,
        reference: reference !== undefined ? reference : existingTransaction.reference,
        balanceChange: newBalanceChange,
        newBalance,
        updatedAt: new Date(),
      }

      await directTransactions.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData },
        { session }
      )

      // Update B2B client balance
      await b2bClients.updateOne(
        { _id: new ObjectId(existingTransaction.b2bClientId) },
        { 
          $set: { 
            balance: newBalance,
            updatedAt: new Date()
          } 
        },
        { session }
      )
    })

    return NextResponse.json({ message: "Transaction updated successfully" })
  } catch (error) {
    console.error("Error updating direct transaction:", error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Internal server error" 
    }, { status: 500 })
  } finally {
    await session.endSession()
  }
}

// DELETE - Delete direct transaction
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await (await clientPromise).startSession()
  
  try {
    const { id } = params

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid transaction ID" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("manage_agency")
    const b2bClients = db.collection("b2b_clients")
    const directTransactions = db.collection("direct_transactions")

    await session.withTransaction(async () => {
      // Get existing transaction
      const existingTransaction = await directTransactions.findOne(
        { _id: new ObjectId(id) },
        { session }
      )
      
      if (!existingTransaction) {
        throw new Error("Transaction not found")
      }

      // Get B2B client
      const b2bClient = await b2bClients.findOne(
        { _id: new ObjectId(existingTransaction.b2bClientId) },
        { session }
      )
      
      if (!b2bClient) {
        throw new Error("Associated B2B client not found")
      }

      // Reverse transaction effect on balance
      const newBalance = b2bClient.balance - existingTransaction.balanceChange

      // Delete transaction
      await directTransactions.deleteOne(
        { _id: new ObjectId(id) },
        { session }
      )

      // Update B2B client balance
      await b2bClients.updateOne(
        { _id: new ObjectId(existingTransaction.b2bClientId) },
        { 
          $set: { 
            balance: newBalance,
            updatedAt: new Date()
          } 
        },
        { session }
      )
    })

    return NextResponse.json({ message: "Transaction deleted successfully" })
  } catch (error) {
    console.error("Error deleting direct transaction:", error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Internal server error" 
    }, { status: 500 })
  } finally {
    await session.endSession()
  }
}