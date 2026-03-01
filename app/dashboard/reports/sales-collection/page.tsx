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

interface CollectionItem {
  id: string
  paymentDate: string
  moneyReceiptNo: string
  particular: string
  client: string
  collectionAmount: number
}

interface SalesItem {
  id: string
  invoiceDate: string
  invoiceNo: string
  client: string
  paxName: string
  ticketNo: string
  netTotal: number
}

interface SalesCollectionReportData {
  collections: {
    items: CollectionItem[]
    total: number
  }
  sales: {
    items: SalesItem[]
    total: number
  }
}

export default function SalesCollectionReportPage() {
  const [selectedClient, setSelectedClient] = useState<string>("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  })
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState<SalesCollectionReportData | null>(null)
  
  const [clients, setClients] = useState<{ label: string; value: string }[]>([])

  // Fetch dropdown data
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const clientRes = await fetch('/api/clients-manager?limit=1000')

        if (clientRes.ok) {
          const json = await clientRes.json()
          const clientOptions = (json.clients || []).map((c: any) => ({ 
            label: `${c.name} - (CL-${String(c.uniqueId || "").padStart(4, '0')})`, 
            value: c.id 
          }))
          setClients([{ label: "All", value: "" }, ...clientOptions])
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
      if (selectedClient) params.append("clientId", selectedClient)
      if (dateRange?.from) params.append("dateFrom", format(dateRange.from, "yyyy-MM-dd"))
      if (dateRange?.to) params.append("dateTo", format(dateRange.to, "yyyy-MM-dd"))

      const res = await fetch(`/api/reports/sales-collection?${params.toString()}`)
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
  }, [selectedClient, dateRange])

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
            <Label className="text-gray-700 font-semibold">Select Client</Label>
            <ClearableSelect
              options={clients}
              value={selectedClient}
              onChange={setSelectedClient}
              placeholder="Select Client"
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

        {/* Collection Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
             <h3 className="text-lg font-bold">Collection</h3>
          </div>
          <Card className="border shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold border-r">SL.</th>
                      <th className="px-4 py-3 text-left font-bold border-r">Payment Date</th>
                      <th className="px-4 py-3 text-left font-bold border-r">Money Receipt No.</th>
                      <th className="px-4 py-3 text-left font-bold border-r">Particular</th>
                      <th className="px-4 py-3 text-left font-bold border-r">Client</th>
                      <th className="px-4 py-3 text-right font-bold">Collection Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y border-b">
                    {reportData?.collections.items.map((item, index) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 border-r">{index + 1}</td>
                        <td className="px-4 py-2 border-r whitespace-nowrap">{item.paymentDate ? format(new Date(item.paymentDate), "dd MMM yyyy") : "-"}</td>
                        <td className="px-4 py-2 border-r">{item.moneyReceiptNo}</td>
                        <td className="px-4 py-2 border-r">{item.particular}</td>
                        <td className="px-4 py-2 border-r">
                          <Link href="#" className="text-sky-500 hover:underline">{item.client}</Link>
                        </td>
                        <td className="px-4 py-2 text-right font-medium">{formatCurrency(item.collectionAmount)}</td>
                      </tr>
                    ))}
                    {(!reportData || reportData.collections.items.length === 0) && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          No collection records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {reportData && reportData.collections.items.length > 0 && (
                    <tfoot className="bg-gray-50 font-bold">
                      <tr>
                        <td colSpan={5} className="px-4 py-3 text-right border-r">Total:</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(reportData.collections.total)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sales Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
             <h3 className="text-lg font-bold">Sales</h3>
          </div>
          <Card className="border shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold border-r">ID</th>
                      <th className="px-4 py-3 text-left font-bold border-r">Invoice Date</th>
                      <th className="px-4 py-3 text-left font-bold border-r">Invoice No.</th>
                      <th className="px-4 py-3 text-left font-bold border-r">Client</th>
                      <th className="px-4 py-3 text-left font-bold border-r">PAX Name</th>
                      <th className="px-4 py-3 text-left font-bold border-r">Ticket No.</th>
                      <th className="px-4 py-3 text-right font-bold">Net Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y border-b">
                    {reportData?.sales.items.map((item, index) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 border-r">{index + 1}</td>
                        <td className="px-4 py-2 border-r whitespace-nowrap">{item.invoiceDate ? format(new Date(item.invoiceDate), "dd MMM yyyy") : "-"}</td>
                        <td className="px-4 py-2 border-r">
                           <Link href={`/dashboard/invoices/${item.id}`} className="text-sky-500 hover:underline">{item.invoiceNo}</Link>
                        </td>
                        <td className="px-4 py-2 border-r">
                          <Link href="#" className="text-sky-500 hover:underline">{item.client}</Link>
                        </td>
                        <td className="px-4 py-2 border-r">{item.paxName}</td>
                        <td className="px-4 py-2 border-r">{item.ticketNo}</td>
                        <td className="px-4 py-2 text-right font-medium">{formatCurrency(item.netTotal)}</td>
                      </tr>
                    ))}
                    {(!reportData || reportData.sales.items.length === 0) && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                          No sales records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {reportData && reportData.sales.items.length > 0 && (
                    <tfoot className="bg-gray-50 font-bold">
                      <tr>
                        <td colSpan={6} className="px-4 py-3 text-right border-r">Total:</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(reportData.sales.total)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
