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

interface PurchaseItem {
  id: string
  salesDate: string
  invoiceNo: string
  invoiceId: string
  ticketNo: string
  vendorName: string
  purchaseAmount: number
}

interface PaymentItem {
  id: string
  paymentDate: string
  vendorName: string
  voucherNo: string
  invoiceNo: string
  cost: number
  payment: number
}

interface VendorReportData {
  purchases: {
    items: PurchaseItem[]
    total: number
  }
  payments: {
    items: PaymentItem[]
    totalCost: number
    totalPayment: number
  }
}

export default function VendorPurchasePaymentPage() {
  const [selectedVendor, setSelectedVendor] = useState<string>("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  })
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState<VendorReportData | null>(null)
  
  const [vendors, setVendors] = useState<{ label: string; value: string }[]>([])

  // Fetch vendors for dropdown
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const res = await fetch('/api/vendors?pageSize=1000')
        if (res.ok) {
          const json = await res.json()
          const vendorList = json.data || json.vendors || []
          const vendorOptions = vendorList.map((v: any) => ({ label: v.name, value: v.id || v._id }))
          setVendors([{ label: "All", value: "" }, ...vendorOptions])
        }
      } catch (e) {
        console.error("Failed to fetch vendors", e)
      }
    }
    fetchVendors()
  }, [])

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedVendor) params.append("vendorId", selectedVendor)
      if (dateRange?.from) params.append("dateFrom", format(dateRange.from, "yyyy-MM-dd"))
      if (dateRange?.to) params.append("dateTo", format(dateRange.to, "yyyy-MM-dd"))

      const res = await fetch(`/api/reports/vendor-purchase-payment?${params.toString()}`)
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
  }, [selectedVendor, dateRange])

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
        <div className="flex flex-col md:flex-row justify-between gap-4 bg-white p-4 rounded-md shadow-sm border">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="w-[200px]">
              <ClearableSelect
                options={vendors}
                value={selectedVendor}
                onChange={setSelectedVendor}
                placeholder="Select Vendor"
              />
            </div>

            <div className="w-[280px]">
              <DateRangePickerWithPresets
                date={dateRange}
                onDateChange={setDateRange}
                className="w-full"
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

        {/* Purchase Table */}
        <div className="space-y-4">
          <div className="border-b pb-2">
             <h3 className="text-lg font-bold">Ticket Purchase From Vendor</h3>
          </div>
          <Card className="border shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold border-r">SL.</th>
                      <th className="px-4 py-3 text-left font-bold border-r">Sales Date</th>
                      <th className="px-4 py-3 text-left font-bold border-r">Invoice No.</th>
                      <th className="px-4 py-3 text-left font-bold border-r">Ticket No</th>
                      <th className="px-4 py-3 text-left font-bold border-r">Vendor Name</th>
                      <th className="px-4 py-3 text-right font-bold">Purchase Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y border-b">
                    {reportData?.purchases.items.map((item, index) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 border-r">{index + 1}</td>
                        <td className="px-4 py-2 border-r whitespace-nowrap">{item.salesDate ? format(new Date(item.salesDate), "dd MMM yyyy") : "-"}</td>
                        <td className="px-4 py-2 border-r">
                           <Link href={`/dashboard/invoices/${item.invoiceId}`} className="text-sky-500 hover:underline">{item.invoiceNo}</Link>
                        </td>
                        <td className="px-4 py-2 border-r">{item.ticketNo}</td>
                        <td className="px-4 py-2 border-r">{item.vendorName}</td>
                        <td className="px-4 py-2 text-right font-medium">{formatCurrency(item.purchaseAmount)}</td>
                      </tr>
                    ))}
                    {(!reportData || reportData.purchases.items.length === 0) && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          No purchase records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {reportData && reportData.purchases.items.length > 0 && (
                    <tfoot className="bg-gray-50 font-bold">
                      <tr>
                        <td colSpan={5} className="px-4 py-3 text-right border-r">Total:</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(reportData.purchases.total)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Table */}
        <div className="space-y-4">
          <div className="border-b pb-2">
             <h3 className="text-lg font-bold">Payment List</h3>
          </div>
          <Card className="border shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold border-r">SL.</th>
                      <th className="px-4 py-3 text-left font-bold border-r">Payment Date</th>
                      <th className="px-4 py-3 text-left font-bold border-r">Vendor Name</th>
                      <th className="px-4 py-3 text-left font-bold border-r">Voucher No</th>
                      <th className="px-4 py-3 text-left font-bold border-r">Invoice No.</th>
                      <th className="px-4 py-3 text-right font-bold border-r">Cost</th>
                      <th className="px-4 py-3 text-right font-bold">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y border-b">
                    {reportData?.payments.items.map((item, index) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 border-r">{index + 1}</td>
                        <td className="px-4 py-2 border-r whitespace-nowrap">{item.paymentDate ? format(new Date(item.paymentDate), "dd MMM yyyy") : "-"}</td>
                        <td className="px-4 py-2 border-r">{item.vendorName}</td>
                        <td className="px-4 py-2 border-r">{item.voucherNo}</td>
                        <td className="px-4 py-2 border-r">{item.invoiceNo}</td>
                        <td className="px-4 py-2 text-right border-r font-medium">{formatCurrency(item.cost)}</td>
                        <td className="px-4 py-2 text-right font-medium">{formatCurrency(item.payment)}</td>
                      </tr>
                    ))}
                    {(!reportData || reportData.payments.items.length === 0) && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                          No payment records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {reportData && reportData.payments.items.length > 0 && (
                    <tfoot className="bg-gray-50 font-bold">
                      <tr>
                        <td colSpan={5} className="px-4 py-3 text-right border-r uppercase">Total:</td>
                        <td className="px-4 py-3 text-right border-r">{formatCurrency(reportData.payments.totalCost)}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(reportData.payments.totalPayment)}</td>
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
