import { ObjectId } from 'mongodb'
import clientPromise from '@/lib/mongodb'
import { TransactionError } from '@/lib/errors/TransactionError'

export interface ReconciliationResult {
  clientId: string
  clientName: string
  oldDueAmount: number
  newDueAmount: number
  difference: number
  wasReconciled: boolean
  error?: string
}

export interface ReconciliationSummary {
  totalClients: number
  reconciledClients: number
  totalDifference: number
  results: ReconciliationResult[]
  errors: string[]
}

export class ReconciliationService {
  private async getDb() {
    const client = await clientPromise
    return client.db("manage_agency")
  }

  async reconcileClientBalance(clientId: string): Promise<ReconciliationResult> {
    try {
      const db = await this.getDb()
      
      // Get client details
      const client = await db.collection("b2c_clients").findOne({ _id: new ObjectId(clientId) })
      if (!client) {
        throw TransactionError.clientNotFound(clientId)
      }

      // Calculate actual due amount from transactions
      const actualDueAmount = await this.calculateActualDueAmount(clientId, client.contractAmount)
      
      // Check if reconciliation is needed
      const difference = actualDueAmount - client.dueAmount
      const wasReconciled = Math.abs(difference) > 0.01 // Allow for small floating point differences

      if (wasReconciled) {
        // Update client's due amount
        await db.collection("b2c_clients").updateOne(
          { _id: new ObjectId(clientId) },
          { 
            $set: { 
              dueAmount: actualDueAmount,
              lastReconciled: new Date(),
              reconciliationDifference: difference
            } 
          }
        )

        // Create audit entry for reconciliation
        const auditEntry = {
          action: 'RECONCILE_BALANCE',
          clientId: clientId,
          oldDueAmount: client.dueAmount,
          newDueAmount: actualDueAmount,
          difference: difference,
          timestamp: new Date(),
          metadata: {
            contractAmount: client.contractAmount,
            initialPayment: client.initialPayment || 0
          }
        }

        await db.collection("transaction_audit").insertOne(auditEntry)
      }

      return {
        clientId: clientId,
        clientName: client.name,
        oldDueAmount: client.dueAmount,
        newDueAmount: actualDueAmount,
        difference: difference,
        wasReconciled: wasReconciled
      }
    } catch (error) {
      return {
        clientId: clientId,
        clientName: 'Unknown',
        oldDueAmount: 0,
        newDueAmount: 0,
        difference: 0,
        wasReconciled: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async reconcileAllClientBalances(): Promise<ReconciliationSummary> {
    try {
      const db = await this.getDb()
      
      // Get all active clients
      const clients = await db.collection("b2c_clients").find({
        $or: [
          { isArchived: { $exists: false } },
          { isArchived: false }
        ]
      }).toArray()

      const results: ReconciliationResult[] = []
      const errors: string[] = []
      let reconciledClients = 0
      let totalDifference = 0

      // Process each client
      for (const client of clients) {
        try {
          const result = await this.reconcileClientBalance(client._id.toString())
          results.push(result)
          
          if (result.wasReconciled) {
            reconciledClients++
            totalDifference += Math.abs(result.difference)
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          errors.push(`Client ${client._id}: ${errorMessage}`)
          
          results.push({
            clientId: client._id.toString(),
            clientName: client.name,
            oldDueAmount: client.dueAmount || 0,
            newDueAmount: 0,
            difference: 0,
            wasReconciled: false,
            error: errorMessage
          })
        }
      }

      return {
        totalClients: clients.length,
        reconciledClients,
        totalDifference,
        results,
        errors
      }
    } catch (error) {
      throw TransactionError.databaseError('reconcileAllClientBalances', error)
    }
  }

  async calculateActualDueAmount(clientId: string, contractAmount: number): Promise<number> {
    try {
      const db = await this.getDb()
      
      // Get all transactions for this client
      const transactions = await db.collection("transactions").find({ clientId }).toArray()
      
      // Calculate total received and refunded amounts
      const totalReceived = transactions.reduce((sum, t) => sum + (t.receivedAmount || 0), 0)
      const totalRefunded = transactions.reduce((sum, t) => sum + (t.refundAmount || 0), 0)
      
      // Calculate net amount received
      const netAmountReceived = totalReceived - totalRefunded
      
      // Due amount = contract amount - net amount received
      const actualDueAmount = contractAmount - netAmountReceived
      
      return Math.max(0, actualDueAmount) // Ensure due amount is never negative
    } catch (error) {
      throw TransactionError.databaseError('calculateActualDueAmount', error)
    }
  }

  async getReconciliationReport(): Promise<{
    summary: ReconciliationSummary
    details: Array<{
      clientId: string
      clientName: string
      contractAmount: number
      initialPayment: number
      currentDueAmount: number
      calculatedDueAmount: number
      difference: number
      transactionCount: number
      lastTransactionDate?: Date
    }>
  }> {
    try {
      const db = await this.getDb()
      
      // Get all active clients with their transaction details
      const clients = await db.collection("b2c_clients").find({
        $or: [
          { isArchived: { $exists: false } },
          { isArchived: false }
        ]
      }).toArray()

      const details = []

      for (const client of clients) {
        try {
          const calculatedDueAmount = await this.calculateActualDueAmount(
            client._id.toString(), 
            client.contractAmount
          )
          
          // Get transaction count and last transaction date
          const transactions = await db.collection("transactions")
            .find({ clientId: client._id.toString() })
            .sort({ createdAt: -1 })
            .toArray()

          const lastTransaction = transactions[0]
          
          details.push({
            clientId: client._id.toString(),
            clientName: client.name,
            contractAmount: client.contractAmount,
            initialPayment: client.initialPayment || 0,
            currentDueAmount: client.dueAmount || 0,
            calculatedDueAmount,
            difference: (client.dueAmount || 0) - calculatedDueAmount,
            transactionCount: transactions.length,
            lastTransactionDate: lastTransaction?.createdAt
          })
        } catch (error) {
          // Skip clients with errors
          console.error(`Error processing client ${client._id}:`, error)
        }
      }

      const summary = await this.reconcileAllClientBalances()

      return {
        summary,
        details
      }
    } catch (error) {
      throw TransactionError.databaseError('getReconciliationReport', error)
    }
  }
} 