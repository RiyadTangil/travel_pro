import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { ReconciliationService } from "@/lib/services/ReconciliationService"
import { TransactionError } from "@/lib/errors/TransactionError"

const reconciliationService = new ReconciliationService()

// GET - Get reconciliation report (dry run)
export async function GET(request: NextRequest) {
  try {
    // Check if user is admin
    const session = await getServerSession()
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action") || "report"

    if (action === "report") {
      // Get reconciliation report without making changes
      const report = await reconciliationService.getReconciliationReport()
      return NextResponse.json(report)
    } else {
      return NextResponse.json({ error: "Invalid action parameter" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error in reconciliation:", error)
    
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

// POST - Run reconciliation (make actual changes)
export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const session = await getServerSession()
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action") || "reconcile"
    const clientId = searchParams.get("clientId")

    if (action === "reconcile") {
      if (clientId) {
        // Reconcile specific client
        const result = await reconciliationService.reconcileClientBalance(clientId)
        return NextResponse.json({
          message: "Client reconciliation completed",
          result
        })
      } else {
        // Reconcile all clients
        const summary = await reconciliationService.reconcileAllClientBalances()
        return NextResponse.json({
          message: "Full reconciliation completed",
          summary
        })
      }
    } else {
      return NextResponse.json({ error: "Invalid action parameter" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error in reconciliation:", error)
    
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