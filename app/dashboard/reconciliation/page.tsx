"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, RefreshCw, AlertTriangle, CheckCircle, DollarSign } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface ReconciliationDetail {
  clientId: string
  clientName: string
  contractAmount: number
  initialPayment: number
  currentDueAmount: number
  calculatedDueAmount: number
  difference: number
  transactionCount: number
  lastTransactionDate?: Date
}

interface ReconciliationSummary {
  totalClients: number
  reconciledClients: number
  totalDifference: number
  results: any[]
  errors: string[]
}

interface ReconciliationReport {
  summary: ReconciliationSummary
  details: ReconciliationDetail[]
}

export default function ReconciliationPage() {
  const [loading, setLoading] = useState(false)
  const [reconciling, setReconciling] = useState(false)
  const [report, setReport] = useState<ReconciliationReport | null>(null)
  const [error, setError] = useState("")

  const generateReport = async () => {
    setLoading(true)
    setError("")
    
    try {
      const response = await fetch("/api/reconciliation?action=report")
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate report")
      }
      
      setReport(data)
      toast({
        title: "Report Generated",
        description: `Found ${data.summary.totalClients} clients with ${data.summary.reconciledClients} needing reconciliation`,
      })
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred")
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate report",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const runReconciliation = async () => {
    if (!confirm("This will update client due amounts. Are you sure you want to proceed?")) {
      return
    }

    setReconciling(true)
    setError("")
    
    try {
      const response = await fetch("/api/reconciliation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reconcile" })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to run reconciliation")
      }
      
      toast({
        title: "Reconciliation Complete",
        description: `Reconciled ${data.summary.reconciledClients} clients with total difference of ${data.summary.totalDifference.toFixed(2)}`,
      })
      
      // Refresh the report
      await generateReport()
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred")
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to run reconciliation",
        variant: "destructive",
      })
    } finally {
      setReconciling(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'BDT'
    }).format(amount)
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString()
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data Reconciliation</h1>
          <p className="text-muted-foreground">
            Check and fix inconsistencies in client due amounts
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={generateReport} 
            disabled={loading}
            variant="outline"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Report...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Generate Report
              </>
            )}
          </Button>
          <Button 
            onClick={runReconciliation} 
            disabled={reconciling || !report}
            variant="default"
          >
            {reconciling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Reconciling...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Run Reconciliation
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {report && (
        <div className="grid gap-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.summary.totalClients}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Need Reconciliation</CardTitle>
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  {report.summary.reconciledClients}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Difference</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(report.summary.totalDifference)}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Errors</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {report.summary.errors.length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Details Table */}
          <Card>
            <CardHeader>
              <CardTitle>Reconciliation Details</CardTitle>
              <CardDescription>
                Detailed breakdown of client balances and discrepancies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client Name</TableHead>
                    <TableHead>Contract Amount</TableHead>
                    <TableHead>Current Due</TableHead>
                    <TableHead>Calculated Due</TableHead>
                    <TableHead>Difference</TableHead>
                    <TableHead>Transactions</TableHead>
                    <TableHead>Last Transaction</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.details.map((detail) => (
                    <TableRow key={detail.clientId}>
                      <TableCell className="font-medium">{detail.clientName}</TableCell>
                      <TableCell>{formatCurrency(detail.contractAmount)}</TableCell>
                      <TableCell>{formatCurrency(detail.currentDueAmount)}</TableCell>
                      <TableCell>{formatCurrency(detail.calculatedDueAmount)}</TableCell>
                      <TableCell>
                        <span className={detail.difference !== 0 ? "text-red-600 font-medium" : "text-green-600"}>
                          {formatCurrency(detail.difference)}
                        </span>
                      </TableCell>
                      <TableCell>{detail.transactionCount}</TableCell>
                      <TableCell>
                        {detail.lastTransactionDate 
                          ? formatDate(detail.lastTransactionDate)
                          : "No transactions"
                        }
                      </TableCell>
                      <TableCell>
                        {detail.difference !== 0 ? (
                          <Badge variant="destructive">Needs Reconciliation</Badge>
                        ) : (
                          <Badge variant="secondary">Balanced</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Errors */}
          {report.summary.errors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Errors</CardTitle>
                <CardDescription>
                  Issues encountered during reconciliation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {report.summary.errors.map((error, index) => (
                    <Alert key={index} variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
} 