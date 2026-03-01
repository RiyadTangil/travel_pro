"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { DashboardHeader } from "@/components/dashboard/header"
import { format } from "date-fns"
import { Search, Printer, FileSpreadsheet } from "lucide-react"
import { ClearableSelect } from "@/components/ui/clearable-select"
import { DateRangePickerWithPresets } from "@/components/ui/date-range-with-presets"
import { DateRange } from "react-day-picker"
import Link from "next/link"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

interface SalesmanCollectionItem {
  id: string
  date: string
  invoiceNo: string
  clientName: string
  salesBy: string
  salesPrice: number
  collectedAmount: number
  due: number
}

interface SalesmanCollectionReportData {
  items: SalesmanCollectionItem[]
  totals: {
    salesPrice: number
    collectedAmount: number
    due: number
  }
}

export default function SalesmanCollectionReportPage() {
  const [selectedSalesman, setSelectedSalesman] = useState<string>("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  })
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState<SalesmanCollectionReportData | null>(null)
  
  const [employees, setEmployees] = useState<{ label: string; value: string }[]>([])

  // Fetch dropdown data
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const empRes = await fetch('/api/employees')

        if (empRes.ok) {
          const json = await empRes.json()
          const employeeOptions = (json.employees || []).map((e: any) => ({ label: e.name, value: e.id }))
          setEmployees([{ label: "All", value: "" }, ...employeeOptions])
        }
      } catch (e) {
        console.error("Failed to fetch dropdown data", e)
      }
    }
    fetchDropdownData()
  }, [])

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedSalesman) params.append("employeeId", selectedSalesman)
      if (dateRange?.from) params.append("dateFrom", format(dateRange.from, "yyyy-MM-dd"))
      if (dateRange?.to) params.append("dateTo", format(dateRange.to, "yyyy-MM-dd"))

      const res = await fetch(`/api/reports/salesman-collection-report?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch report")
      const data = await res.json()
      setReportData(data)
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to load report",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [selectedSalesman, dateRange])

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
        <div className="flex gap-2">
          <Button variant="outline" className="bg-sky-500 text-white hover:bg-sky-600 border-none" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
          <Button variant="outline" className="bg-sky-500 text-white hover:bg-sky-600 border-none">
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel Report
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end bg-white p-4 rounded-md shadow-sm border">
          <div className="space-y-2">
            <Label className="text-gray-700 font-semibold">Select Sales Man</Label>
            <ClearableSelect
              options={employees}
              value={selectedSalesman}
              onChange={setSelectedSalesman}
              placeholder="All"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-red-500 font-semibold">* <span className="text-gray-700">Date Range</span></Label>
            <DateRangePickerWithPresets
              date={dateRange}
              onDateChange={setDateRange}
              className="w-full"
            />
          </div>

          <div className="flex justify-start">
            <Button onClick={fetchReport} disabled={loading} className="bg-sky-500 hover:bg-sky-600 text-white px-8">
              {loading ? "Searching..." : <><Search className="w-4 h-4 mr-2" /> Search</>}
            </Button>
          </div>
        </div>

        <Card className="border shadow-sm">
          <CardContent className="p-0">
            <div className="p-4 border-b">
               <h3 className="text-lg font-bold text-center">Sales Man Wise Collection & Due</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold border-r">SL.</th>
                    <th className="px-4 py-3 text-left font-bold border-r">Date</th>
                    <th className="px-4 py-3 text-left font-bold border-r">Invoice No</th>
                    <th className="px-4 py-3 text-left font-bold border-r">Client Name</th>
                    <th className="px-4 py-3 text-left font-bold border-r">Sales By</th>
                    <th className="px-4 py-3 text-right font-bold border-r">Sales Price</th>
                    <th className="px-4 py-3 text-right font-bold border-r">Collected Amount</th>
                    <th className="px-4 py-3 text-right font-bold">Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-b">
                  {reportData?.items.map((item, index) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 border-r">{index + 1}</td>
                      <td className="px-4 py-2 border-r whitespace-nowrap">{item.date ? format(new Date(item.date), "dd-MM-yyyy") : "-"}</td>
                      <td className="px-4 py-2 border-r">
                        <Link href={`/dashboard/invoices/${item.id}`} className="text-sky-500 hover:underline">
                          {item.invoiceNo}
                        </Link>
                      </td>
                      <td className="px-4 py-2 border-r">{item.clientName}</td>
                      <td className="px-4 py-2 border-r">{item.salesBy}</td>
                      <td className="px-4 py-2 text-right border-r font-medium">{formatCurrency(item.salesPrice)}</td>
                      <td className="px-4 py-2 text-right border-r font-medium">{formatCurrency(item.collectedAmount)}</td>
                      <td className="px-4 py-2 text-right font-medium text-red-500">{formatCurrency(item.due)}</td>
                    </tr>
                  ))}
                  {(!reportData || reportData.items.length === 0) && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        No records found for the selected criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
                {reportData && reportData.items.length > 0 && (
                  <tfoot className="bg-gray-50 font-bold">
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-right border-r uppercase">Total:</td>
                      <td className="px-4 py-3 text-right border-r">{formatCurrency(reportData.totals.salesPrice)}</td>
                      <td className="px-4 py-3 text-right border-r">{formatCurrency(reportData.totals.collectedAmount)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(reportData.totals.due)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
