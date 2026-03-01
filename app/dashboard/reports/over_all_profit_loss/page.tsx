"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { DashboardHeader } from "@/components/dashboard/header"
import { format } from "date-fns"
import { Search, Printer, FileSpreadsheet } from "lucide-react"
import { DateRangePickerWithPresets } from "@/components/ui/date-range-with-presets"
import { DateRange } from "react-day-picker"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

interface ProfitLossData {
  salesIncome: {
    sales: number
    purchase: number
    profit_loss: number
  }
  expense: {
    discount: number
    expense: number
    payroll: number
    transaction_charge: number
    ait: number
    agent_payment: number
  }
  income: {
    service_charge: number
    void_charge: number
    refund_profit: number
    incentive: number
    non_invoice_income: number
  }
  netProfitLoss: {
    totalIncome: number
    totalExpense: number
    netProfitLoss: number
  }
}

export default function OverAllProfitLossPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  })
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState<ProfitLossData | null>(null)

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (dateRange?.from) params.append("dateFrom", format(dateRange.from, "yyyy-MM-dd"))
      if (dateRange?.to) params.append("dateTo", format(dateRange.to, "yyyy-MM-dd"))

      const res = await fetch(`/api/reports/profit-loss?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch report")
      const data = await res.json()
      setReportData(data)
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to load profit & loss report",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [dateRange])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm px-4 py-4">
        <DashboardHeader />
      </header>

      <main className="flex-grow py-6 px-4 space-y-6">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="w-[280px]">
              <Label className="text-red-500 font-semibold">* <span className="text-gray-700">Date Range</span></Label>
              <DateRangePickerWithPresets
                date={dateRange}
                onDateChange={setDateRange}
                className="w-full mt-2"
              />
            </div>
            <Button onClick={fetchReport} disabled={loading} className="bg-sky-500 hover:bg-sky-600 text-white px-8">
              {loading ? "Searching..." : <><Search className="w-4 h-4 mr-2" /> Search</>}
            </Button>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="bg-sky-500 text-white hover:bg-sky-600 border-none" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" /> Print
            </Button>
            <Button variant="outline" className="bg-sky-500 text-white hover:bg-sky-600 border-none">
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel Report
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Income Card */}
          <div className="space-y-6">
            <Card className="border shadow-sm">
              <CardContent className="p-0">
                <div className="p-4 border-b bg-gray-50/50">
                  <h3 className="font-bold text-gray-700 text-center uppercase tracking-wide">Sales Income</h3>
                </div>
                <table className="w-full text-sm">
                  <tbody className="divide-y">
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-600 uppercase">Sales</td>
                      <td className="px-6 py-4 text-right font-semibold">{formatCurrency(reportData?.salesIncome.sales || 0)}</td>
                    </tr>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-600 uppercase">Purchase</td>
                      <td className="px-6 py-4 text-right font-semibold">{formatCurrency(reportData?.salesIncome.purchase || 0)}</td>
                    </tr>
                    <tr className="hover:bg-gray-50 transition-colors bg-blue-50/30">
                      <td className="px-6 py-4 font-bold text-blue-700 uppercase">Sales Profit/Loss</td>
                      <td className="px-6 py-4 text-right font-bold text-blue-700">{formatCurrency(reportData?.salesIncome.profit_loss || 0)}</td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Income Card */}
            <Card className="border shadow-sm">
              <CardContent className="p-0">
                <div className="p-4 border-b bg-gray-50/50">
                  <h3 className="font-bold text-gray-700 text-center uppercase tracking-wide">Income</h3>
                </div>
                <table className="w-full text-sm">
                  <tbody className="divide-y">
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-600 uppercase">Service Charge</td>
                      <td className="px-6 py-4 text-right font-semibold">{formatCurrency(reportData?.income.service_charge || 0)}</td>
                    </tr>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-600 uppercase">Void Charge</td>
                      <td className="px-6 py-4 text-right font-semibold">{formatCurrency(reportData?.income.void_charge || 0)}</td>
                    </tr>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-600 uppercase">Refund Profit</td>
                      <td className="px-6 py-4 text-right font-semibold">{formatCurrency(reportData?.income.refund_profit || 0)}</td>
                    </tr>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-600 uppercase">Incentive</td>
                      <td className="px-6 py-4 text-right font-semibold">{formatCurrency(reportData?.income.incentive || 0)}</td>
                    </tr>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-600 uppercase">Non Invoice Income</td>
                      <td className="px-6 py-4 text-right font-semibold">{formatCurrency(reportData?.income.non_invoice_income || 0)}</td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

          {/* Expense Card */}
          <div className="space-y-6">
            <Card className="border shadow-sm h-full">
              <CardContent className="p-0">
                <div className="p-4 border-b bg-gray-50/50">
                  <h3 className="font-bold text-gray-700 text-center uppercase tracking-wide">Expense</h3>
                </div>
                <table className="w-full text-sm">
                  <tbody className="divide-y">
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-600 uppercase">Discount</td>
                      <td className="px-6 py-4 text-right font-semibold">{formatCurrency(reportData?.expense.discount || 0)}</td>
                    </tr>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-600 uppercase">Expense</td>
                      <td className="px-6 py-4 text-right font-semibold">{formatCurrency(reportData?.expense.expense || 0)}</td>
                    </tr>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-600 uppercase">Payroll</td>
                      <td className="px-6 py-4 text-right font-semibold">{formatCurrency(reportData?.expense.payroll || 0)}</td>
                    </tr>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-600 uppercase">Transaction Charge</td>
                      <td className="px-6 py-4 text-right font-semibold">{formatCurrency(reportData?.expense.transaction_charge || 0)}</td>
                    </tr>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-600 uppercase">AIT</td>
                      <td className="px-6 py-4 text-right font-semibold">{formatCurrency(reportData?.expense.ait || 0)}</td>
                    </tr>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-600 uppercase">Agent Payment</td>
                      <td className="px-6 py-4 text-right font-semibold">{formatCurrency(reportData?.expense.agent_payment || 0)}</td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Net Profit/Loss Section */}
        <Card className="border shadow-sm bg-white overflow-hidden">
          <CardContent className="p-0">
            <div className="p-4 border-b bg-gray-50/50">
               <h3 className="text-lg font-bold text-center uppercase tracking-wider text-gray-800">Net Profit/Loss</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x">
              <div className="p-6 flex justify-between items-center group hover:bg-gray-50 transition-colors">
                <span className="font-bold text-gray-500 uppercase text-xs tracking-widest">Total Income</span>
                <span className="text-lg font-bold text-gray-900">{formatCurrency(reportData?.netProfitLoss.totalIncome || 0)}</span>
              </div>
              <div className="p-6 flex justify-between items-center group hover:bg-gray-50 transition-colors">
                <span className="font-bold text-gray-500 uppercase text-xs tracking-widest">Total Expense</span>
                <span className="text-lg font-bold text-gray-900">{formatCurrency(reportData?.netProfitLoss.totalExpense || 0)}</span>
              </div>
              <div className="p-6 flex justify-between items-center group hover:bg-gray-50 transition-colors">
                <span className="font-bold text-red-500 uppercase text-xs tracking-widest">Net Profit/Loss</span>
                <span className={cn(
                  "text-xl font-black",
                  (reportData?.netProfitLoss.netProfitLoss || 0) >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {formatCurrency(Math.abs(reportData?.netProfitLoss.netProfitLoss || 0))}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
