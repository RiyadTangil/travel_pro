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

interface ItemSalesmanItem {
  id: string
  salesDate: string
  invoiceNo: string
  invoiceId: string
  productName: string
  clientName: string
  clientId: string
  salesBy: string
  salesAmount: number
}

interface ItemSalesmanReportData {
  items: ItemSalesmanItem[]
  pagination: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
  totals: {
    salesAmount: number
  }
}

export default function ItemSalesmanReportPage() {
  const [selectedEmployee, setSelectedEmployee] = useState<string>("")
  const [selectedProduct, setSelectedProduct] = useState<string>("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState<ItemSalesmanReportData | null>(null)
  
  const [products, setProducts] = useState<{ label: string; value: string }[]>([])
  const [employees, setEmployees] = useState<{ label: string; value: string }[]>([])

  // Fetch dropdown data
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [prodRes, empRes] = await Promise.all([
          fetch('/api/products?pageSize=1000'),
          fetch('/api/employees')
        ])

        if (prodRes.ok) {
          const json = await prodRes.json()
          const productList = json.data || json.products || []
          const productOptions = productList.map((p: any) => ({ 
            label: p.name || p.product_name, 
            value: p.name || p.product_name 
          }))
          setProducts([{ label: "All", value: "" }, ...productOptions])
        }

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

  const fetchReport = useCallback(async (pageNum = 1) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedEmployee) params.append("employeeId", selectedEmployee)
      if (selectedProduct) params.append("productName", selectedProduct)
      if (dateRange?.from) params.append("dateFrom", format(dateRange.from, "yyyy-MM-dd"))
      if (dateRange?.to) params.append("dateTo", format(dateRange.to, "yyyy-MM-dd"))
      params.append("page", String(pageNum))
      params.append("pageSize", "20")

      const res = await fetch(`/api/reports/item-salesman-report?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch report")
      const data = await res.json()
      setReportData(data)
      setPage(pageNum)
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to load report",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [selectedEmployee, selectedProduct, dateRange])

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
            <Label className="text-gray-700 font-semibold">Select sales by</Label>
            <ClearableSelect
              options={employees}
              value={selectedEmployee}
              onChange={setSelectedEmployee}
              placeholder="All"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 font-semibold">Select Product</Label>
            <ClearableSelect
              options={products}
              value={selectedProduct}
              onChange={setSelectedProduct}
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
            <Button onClick={() => fetchReport(1)} disabled={loading} className="bg-sky-500 hover:bg-sky-600 text-white px-8">
              {loading ? "Searching..." : <><Search className="w-4 h-4 mr-2" /> Search</>}
            </Button>
          </div>
        </div>

        <Card className="border shadow-sm">
          <CardContent className="p-0">
            <div className="p-4 border-b">
               <h3 className="text-lg font-bold text-center">Item & Sales Man-Wise Sales Report</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold border-r">SL.</th>
                    <th className="px-4 py-3 text-left font-bold border-r">Sales Date</th>
                    <th className="px-4 py-3 text-left font-bold border-r">Invoice No</th>
                    <th className="px-4 py-3 text-left font-bold border-r">Product Name</th>
                    <th className="px-4 py-3 text-left font-bold border-r">Client Name</th>
                    <th className="px-4 py-3 text-left font-bold border-r">Sales By</th>
                    <th className="px-4 py-3 text-right font-bold">Sales Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-b">
                  {reportData?.items.map((item, index) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 border-r">{(page - 1) * 20 + index + 1}</td>
                      <td className="px-4 py-2 border-r whitespace-nowrap">{item.salesDate ? format(new Date(item.salesDate), "dd-MM-yyyy") : "-"}</td>
                      <td className="px-4 py-2 border-r">
                        <Link href={`/dashboard/invoices/${item.invoiceId}`} className="text-sky-500 hover:underline">
                          {item.invoiceNo}
                        </Link>
                      </td>
                      <td className="px-4 py-2 border-r">{item.productName}</td>
                      <td className="px-4 py-2 border-r">
                        <Link href={`/dashboard/reports/client-ledger?clientId=${item.clientId}`} className="text-sky-500 hover:underline">
                          {item.clientName}
                        </Link>
                      </td>
                      <td className="px-4 py-2 border-r">
                        <Link href="#" className="text-sky-500 hover:underline">
                          {item.salesBy}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-right font-medium">{formatCurrency(item.salesAmount)}</td>
                    </tr>
                  ))}
                  {reportData?.items.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        No records found for the selected criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
                {reportData && reportData.items.length > 0 && (
                  <tfoot className="bg-gray-50 font-bold">
                    <tr>
                      <td colSpan={6} className="px-4 py-3 text-right border-r uppercase text-lg">Total:</td>
                      <td className="px-4 py-3 text-right text-lg">{formatCurrency(reportData.totals.salesAmount)}</td>
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
