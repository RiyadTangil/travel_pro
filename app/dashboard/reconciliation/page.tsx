"use client"

import { useState } from "react"
import { PageWrapper } from "@/components/shared/page-wrapper"
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
    <PageWrapper breadcrumbs={[{ label: "Reconciliation" }]}>
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
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${report.summary.totalDifference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(report.summary.totalDifference)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Status</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {report.summary.reconciledClients === 0 ? (
                      <span className="text-green-600">Clean</span>
                    ) : (
                      <span className="text-amber-600">Sync Needed</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Table */}
            {report.details.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Inconsistent Client Balances</CardTitle>
                  <CardDescription>
                    Clients whose current due amount doesn't match their transaction history
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead className="text-right">Contract</TableHead>
                        <TableHead className="text-right">Initial Pay</TableHead>
                        <TableHead className="text-right">Current Due</TableHead>
                        <TableHead className="text-right">Calculated Due</TableHead>
                        <TableHead className="text-right">Difference</TableHead>
                        <TableHead>Last Trx</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.details.map((detail) => (
                        <TableRow key={detail.clientId}>
                          <TableCell className="font-medium">{detail.clientName}</TableCell>
                          <TableCell className="text-right">{formatCurrency(detail.contractAmount)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(detail.initialPayment)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(detail.currentDueAmount)}</TableCell>
                          <TableCell className="text-right font-bold">{formatCurrency(detail.calculatedDueAmount)}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={detail.difference === 0 ? "secondary" : "destructive"}>
                              {formatCurrency(detail.difference)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {detail.lastTransactionDate ? formatDate(detail.lastTransactionDate) : "Never"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </PageWrapper>
  )
} 