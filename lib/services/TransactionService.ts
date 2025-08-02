import { ObjectId } from 'mongodb'
import clientPromise from '@/lib/mongodb'
import { TransactionError } from '@/lib/errors/TransactionError'

export interface CreateTransactionDTO {
  clientId: string
  clientName: string
  date: string
  receivedAmount: number
  refundAmount: number
  notes?: string
  transactionType: string
}

export interface UpdateTransactionDTO {
  date?: string
  receivedAmount?: number
  refundAmount?: number
  notes?: string
}

export class TransactionService {
  private async getDb() {
    const client = await clientPromise
    return client.db("manage_agency")
  }

  async createTransaction(data: CreateTransactionDTO) {
    const db = await this.getDb()
    const mongoClient = await clientPromise
    const session = mongoClient.startSession()

    try {
      return await session.withTransaction(async () => {
        // Validate client exists
        const client = await db.collection("b2c_clients").findOne(
          { _id: new ObjectId(data.clientId) },
          { session }
        )

        if (!client) {
          throw TransactionError.clientNotFound(data.clientId)
        }

        // Validate amounts
        if (data.receivedAmount < 0) {
          throw TransactionError.invalidAmount(data.receivedAmount)
        }
        if (data.refundAmount < 0) {
          throw TransactionError.invalidAmount(data.refundAmount)
        }

        // Create transaction object
        const newTransaction = {
          clientId: data.clientId,
          clientName: data.clientName,
          date: data.date,
          receivedAmount: data.receivedAmount,
          refundAmount: data.refundAmount,
          notes: data.notes || "",
          transactionType: data.transactionType || "B2C",
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        // Insert transaction
        const result = await db.collection("transactions").insertOne(newTransaction, { session })

        // Calculate net amount and update client due amount
        const netAmount = data.receivedAmount - data.refundAmount
        await db.collection("b2c_clients").updateOne(
          { _id: new ObjectId(data.clientId) },
          { $inc: { dueAmount: -netAmount } },
          { session }
        )

        // Create audit entry
        const auditEntry = {
          action: 'CREATE_TRANSACTION',
          clientId: data.clientId,
          transactionId: result.insertedId,
          oldDueAmount: client.dueAmount,
          newDueAmount: client.dueAmount - netAmount,
          amount: netAmount,
          timestamp: new Date(),
          metadata: {
            receivedAmount: data.receivedAmount,
            refundAmount: data.refundAmount,
            notes: data.notes
          }
        }

        await db.collection("transaction_audit").insertOne(auditEntry, { session })

        return {
          transactionId: result.insertedId,
          transaction: { ...newTransaction, _id: result.insertedId },
          oldDueAmount: client.dueAmount,
          newDueAmount: client.dueAmount - netAmount
        }
      })
    } catch (error) {
      if (error instanceof TransactionError) {
        throw error
      }
      throw TransactionError.databaseError('createTransaction', error)
    } finally {
      await session.endSession()
    }
  }

  async updateTransaction(transactionId: string, data: UpdateTransactionDTO) {
    const db = await this.getDb()
    const mongoClient = await clientPromise
    const session = mongoClient.startSession()

    try {
      return await session.withTransaction(async () => {
        // Get the old transaction
        const oldTransaction = await db.collection("transactions").findOne(
          { _id: new ObjectId(transactionId) },
          { session }
        )

        if (!oldTransaction) {
          throw TransactionError.transactionNotFound(transactionId)
        }

        // Validate amounts if provided
        if (data.receivedAmount !== undefined && data.receivedAmount < 0) {
          throw TransactionError.invalidAmount(data.receivedAmount)
        }
        if (data.refundAmount !== undefined && data.refundAmount < 0) {
          throw TransactionError.invalidAmount(data.refundAmount)
        }

        // Calculate old and new net amounts
        const oldNetAmount = oldTransaction.receivedAmount - (oldTransaction.refundAmount || 0)
        const newReceivedAmount = data.receivedAmount ?? oldTransaction.receivedAmount
        const newRefundAmount = data.refundAmount ?? oldTransaction.refundAmount
        const newNetAmount = newReceivedAmount - newRefundAmount
        const amountDifference = newNetAmount - oldNetAmount

        // Update transaction
        const updateData = {
          ...data,
          updatedAt: new Date()
        }

        await db.collection("transactions").updateOne(
          { _id: new ObjectId(transactionId) },
          { $set: updateData },
          { session }
        )

        // Update client's due amount based on the difference
        if (amountDifference !== 0) {
          await db.collection("b2c_clients").updateOne(
            { _id: new ObjectId(oldTransaction.clientId) },
            { $inc: { dueAmount: -amountDifference } },
            { session }
          )
        }

        // Create audit entry
        const client = await db.collection("b2c_clients").findOne(
          { _id: new ObjectId(oldTransaction.clientId) },
          { session }
        )

        if (!client) {
          throw TransactionError.clientNotFound(oldTransaction.clientId)
        }

        const auditEntry = {
          action: 'UPDATE_TRANSACTION',
          clientId: oldTransaction.clientId,
          transactionId: new ObjectId(transactionId),
          oldDueAmount: client.dueAmount,
          newDueAmount: client.dueAmount - amountDifference,
          amountDifference: -amountDifference,
          timestamp: new Date(),
          metadata: {
            oldTransaction,
            newData: updateData
          }
        }

        await db.collection("transaction_audit").insertOne(auditEntry, { session })

        return {
          message: "Transaction updated successfully",
          amountDifference: -amountDifference
        }
      })
    } catch (error) {
      if (error instanceof TransactionError) {
        throw error
      }
      throw TransactionError.databaseError('updateTransaction', error)
    } finally {
      await session.endSession()
    }
  }

  async deleteTransaction(transactionId: string) {
    const db = await this.getDb()
    const mongoClient = await clientPromise
    const session = mongoClient.startSession()

    try {
      return await session.withTransaction(async () => {
        // Get the transaction before deleting
        const transaction = await db.collection("transactions").findOne(
          { _id: new ObjectId(transactionId) },
          { session }
        )

        if (!transaction) {
          throw TransactionError.transactionNotFound(transactionId)
        }

        // Delete the transaction
        await db.collection("transactions").deleteOne(
          { _id: new ObjectId(transactionId) },
          { session }
        )

        // Reverse the transaction's effect on client due amount
        const netAmount = transaction.receivedAmount - (transaction.refundAmount || 0)
        await db.collection("b2c_clients").updateOne(
          { _id: new ObjectId(transaction.clientId) },
          { $inc: { dueAmount: netAmount } },
          { session }
        )

        // Create audit entry
        const client = await db.collection("b2c_clients").findOne(
          { _id: new ObjectId(transaction.clientId) },
          { session }
        )

        if (!client) {
          throw TransactionError.clientNotFound(transaction.clientId)
        }

        const auditEntry = {
          action: 'DELETE_TRANSACTION',
          clientId: transaction.clientId,
          transactionId: new ObjectId(transactionId),
          oldDueAmount: client.dueAmount,
          newDueAmount: client.dueAmount + netAmount,
          reversedAmount: netAmount,
          timestamp: new Date(),
          metadata: {
            deletedTransaction: transaction
          }
        }

        await db.collection("transaction_audit").insertOne(auditEntry, { session })

        return {
          message: "Transaction deleted successfully",
          reversedAmount: netAmount
        }
      })
    } catch (error) {
      if (error instanceof TransactionError) {
        throw error
      }
      throw TransactionError.databaseError('deleteTransaction', error)
    } finally {
      await session.endSession()
    }
  }

  async getTransactionsForClient(clientId: string, page: number = 1, limit: number = 10) {
    try {
      const db = await this.getDb()
      
      const filter = { clientId }
      const total = await db.collection("transactions").countDocuments(filter)
      
      const transactions = await db.collection("transactions")
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray()

      return {
        transactions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      }
    } catch (error) {
      throw TransactionError.databaseError('getTransactionsForClient', error)
    }
  }
} 