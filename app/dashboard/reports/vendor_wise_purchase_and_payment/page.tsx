"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { PageWrapper } from "@/components/shared/page-wrapper"
import { format, parseISO } from "date-fns"
import { Search, Printer, FileSpreadsheet } from "lucide-react"
import { ClearableSelect } from "@/components/shared/clearable-select"
import { DateRangePickerWithPresets } from "@/components/shared/date-range-with-presets"
import { DateRange } from "react-day-picker"
import Link from "next/link"
import { toast } from "@/components/ui/use-toast"
import { Table } from "antd"
import type { ColumnsType } from "antd/es/table"
import { useSearchParams } from "next/navigation"

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
  const searchParams = useSearchParams()
  const dailyParam = searchParams.get("daily")

  const [selectedVendor, setSelectedVendor] = useState<string>("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    if (dailyParam) {
      const parsedDate = parseISO(dailyParam)
      return { from: parsedDate, to: parsedDate }
    }
    return {
      from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      to: new Date(),
    }
  })
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState<VendorReportData | null>(null)
  
  const [vendors, setVendors] = useState<{ label: string; value: string }[]>([])

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
      toast({ title: "Error", description: "Failed to load report", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [selectedVendor, dateRange])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount)

  const purchaseColumns: ColumnsType<PurchaseItem> = [
    {
      title: "SL.",
      key: "sl",
      width: 60,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: "Sales Date",
      dataIndex: "salesDate",
      key: "salesDate",
      width: 120,
      render: (v: string) => v ? format(new Date(v), "dd MMM yyyy") : "-",
    },
    {
      title: "Invoice No.",
      dataIndex: "invoiceNo",
      key: "invoiceNo",
      width: 140,
      render: (v: string, row: PurchaseItem) => (
        <Link href={`/dashboard/invoices/${row.invoiceId}`} className="text-sky-500 hover:underline">{v}</Link>
      ),
    },
    {
      title: "Ticket No",
      dataIndex: "ticketNo",
      key: "ticketNo",
      width: 130,
    },
    {
      title: "Vendor Name",
      dataIndex: "vendorName",
      key: "vendorName",
      width: 160,
    },
    {
      title: "Purchase Amount",
      dataIndex: "purchaseAmount",
      key: "purchaseAmount",
      align: "right",
      width: 140,
      render: (v: number) => formatCurrency(v),
    },
  ]

  const paymentColumns: ColumnsType<PaymentItem> = [
    {
      title: "SL.",
      key: "sl",
      width: 60,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: "Payment Date",
      dataIndex: "paymentDate",
      key: "paymentDate",
      width: 120,
      render: (v: string) => v ? format(new Date(v), "dd MMM yyyy") : "-",
    },
    {
      title: "Vendor Name",
      dataIndex: "vendorName",
      key: "vendorName",
      width: 160,
    },
    {
      title: "Voucher No",
      dataIndex: "voucherNo",
      key: "voucherNo",
      width: 130,
    },
    {
      title: "Invoice No.",
      dataIndex: "invoiceNo",
      key: "invoiceNo",
      width: 130,
    },
    {
      title: "Cost",
      dataIndex: "cost",
      key: "cost",
      align: "right",
      width: 110,
      render: (v: number) => formatCurrency(v),
    },
    {
      title: "Payment",
      dataIndex: "payment",
      key: "payment",
      align: "right",
      width: 110,
      render: (v: number) => formatCurrency(v),
    },
  ]

  return (
    <PageWrapper breadcrumbs={[{ label: "Reports", href: "/dashboard/reports" }, { label: "Vendor Wise Purchase & Payment" }]}>
      <div className="px-2 sm:px-4 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4 bg-white p-4 rounded-md shadow-sm border">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="w-full sm:w-[200px]">
              <Label className="text-gray-700 font-semibold text-sm mb-1 block">Select Vendor</Label>
              <ClearableSelect options={vendors} value={selectedVendor} onChange={setSelectedVendor} placeholder="All" />
            </div>

            <div className="w-full sm:w-[280px]">
              <DateRangePickerWithPresets date={dateRange} onDateChange={setDateRange} className="w-full" />
            </div>

            <Button onClick={fetchReport} disabled={loading} className="bg-sky-500 hover:bg-sky-600 text-white w-full sm:w-auto px-8">
              {loading ? "Searching..." : <><Search className="w-4 h-4 mr-2" /> Search</>}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="bg-sky-500 text-white hover:bg-sky-600 border-none" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" /> Print
            </Button>
            <Button variant="outline" className="bg-sky-500 text-white hover:bg-sky-600 border-none">
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel Report
            </Button>
          </div>
        </div>

        {/* Purchase Table */}
        <div className="space-y-3">
          <div className="border-b pb-2">
            <h3 className="text-lg font-bold">Ticket Purchase From Vendor</h3>
          </div>
          <div className="bg-white rounded-md border shadow-sm">
            <Table
              columns={purchaseColumns}
              dataSource={reportData?.purchases.items || []}
              rowKey="id"
              loading={loading}
              size="small"
              scroll={{ x: 700 }}
              pagination={false}
              summary={() =>
                reportData && reportData.purchases.items.length > 0 ? (
                  <Table.Summary fixed>
                    <Table.Summary.Row className="font-bold bg-gray-50">
                      <Table.Summary.Cell index={0} colSpan={5} align="right">
                        <span className="font-bold">Total:</span>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right">
                        <span className="font-bold">{formatCurrency(reportData.purchases.total)}</span>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                ) : null
              }
            />
          </div>
        </div>

        {/* Payment Table */}
        <div className="space-y-3">
          <div className="border-b pb-2">
            <h3 className="text-lg font-bold">Payment List</h3>
          </div>
          <div className="bg-white rounded-md border shadow-sm">
            <Table
              columns={paymentColumns}
              dataSource={reportData?.payments.items || []}
              rowKey="id"
              loading={loading}
              size="small"
              scroll={{ x: 800 }}
              pagination={false}
              summary={() =>
                reportData && reportData.payments.items.length > 0 ? (
                  <Table.Summary fixed>
                    <Table.Summary.Row className="font-bold bg-gray-50">
                      <Table.Summary.Cell index={0} colSpan={5} align="right">
                        <span className="font-bold uppercase">Total:</span>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right">
                        <span className="font-bold">{formatCurrency(reportData.payments.totalCost)}</span>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2} align="right">
                        <span className="font-bold">{formatCurrency(reportData.payments.totalPayment)}</span>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                ) : null
              }
            />
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
