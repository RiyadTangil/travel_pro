"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { format } from "date-fns"
import { Search, Printer, FileSpreadsheet } from "lucide-react"
import { ClearableSelect } from "@/components/shared/clearable-select"
import { DateRangePickerWithPresets } from "@/components/shared/date-range-with-presets"
import { DateRange } from "react-day-picker"
import Link from "next/link"
import { toast } from "@/components/ui/use-toast"
import { PageWrapper } from "@/components/shared/page-wrapper"
import { Table } from "antd"
import type { ColumnsType } from "antd/es/table"

interface CollectionItem {
  id: string
  paymentDate: string
  moneyReceiptNo: string
  particular: string
  client: string
  clientId?: string
  collectionAmount: number
}

interface SalesItem {
  id: string
  invoiceDate: string
  invoiceNo: string
  client: string
  clientId?: string
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
      toast({ title: "Error", description: "Failed to load report", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [selectedClient, dateRange])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount)

  const collectionColumns: ColumnsType<CollectionItem> = [
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
      width: 130,
      render: (v: string) => v ? format(new Date(v), "dd MMM yyyy") : "-",
    },
    {
      title: "Money Receipt No.",
      dataIndex: "moneyReceiptNo",
      key: "moneyReceiptNo",
      width: 160,
    },
    {
      title: "Particular",
      dataIndex: "particular",
      key: "particular",
      width: 180,
    },
    {
      title: "Client",
      dataIndex: "client",
      key: "client",
      width: 160,
      render: (v: string, row: CollectionItem) => (
        <Link href={row.clientId ? `/dashboard/reports/client-ledger?clientId=${row.clientId}` : "#"} className="text-sky-500 hover:underline">
          {v}
        </Link>
      ),
    },
    {
      title: "Collection Amount",
      dataIndex: "collectionAmount",
      key: "collectionAmount",
      align: "right",
      width: 150,
      render: (v: number) => formatCurrency(v),
    },
  ]

  const salesColumns: ColumnsType<SalesItem> = [
    {
      title: "SL.",
      key: "sl",
      width: 60,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: "Invoice Date",
      dataIndex: "invoiceDate",
      key: "invoiceDate",
      width: 130,
      render: (v: string) => v ? format(new Date(v), "dd MMM yyyy") : "-",
    },
    {
      title: "Invoice No.",
      dataIndex: "invoiceNo",
      key: "invoiceNo",
      width: 140,
      render: (v: string, row: SalesItem) => (
        <Link href={`/dashboard/invoices/${row.id}`} className="text-sky-500 hover:underline">{v}</Link>
      ),
    },
    {
      title: "Client",
      dataIndex: "client",
      key: "client",
      width: 160,
      render: (v: string, row: SalesItem) => (
        <Link href={row.clientId ? `/dashboard/reports/client-ledger?clientId=${row.clientId}` : "#"} className="text-sky-500 hover:underline">
          {v}
        </Link>
      ),
    },
    {
      title: "PAX Name",
      dataIndex: "paxName",
      key: "paxName",
      width: 140,
    },
    {
      title: "Ticket No.",
      dataIndex: "ticketNo",
      key: "ticketNo",
      width: 130,
    },
    {
      title: "Net Total",
      dataIndex: "netTotal",
      key: "netTotal",
      align: "right",
      width: 120,
      render: (v: number) => formatCurrency(v),
    },
  ]

  return (
    <PageWrapper breadcrumbs={[{ label: "Reports", href: "/dashboard/reports" }, { label: "Sales Collection Report" }]}>
      <div className="px-2 sm:px-4 space-y-6">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="bg-sky-500 text-white hover:bg-sky-600 border-none" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
          <Button variant="outline" className="bg-sky-500 text-white hover:bg-sky-600 border-none">
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel Report
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end bg-white p-4 rounded-md shadow-sm border">
          <div className="space-y-2">
            <Label className="text-gray-700 font-semibold">Select Client</Label>
            <ClearableSelect options={clients} value={selectedClient} onChange={setSelectedClient} placeholder="Select Client" />
          </div>

          <div className="space-y-2">
            <Label className="text-red-500 font-semibold">* <span className="text-gray-700">Date Range</span></Label>
            <DateRangePickerWithPresets date={dateRange} onDateChange={setDateRange} className="w-full" />
          </div>

          <div className="flex justify-start sm:col-start-1 lg:col-start-auto">
            <Button onClick={fetchReport} disabled={loading} className="bg-sky-500 hover:bg-sky-600 text-white w-full sm:w-auto px-8">
              {loading ? "Searching..." : <><Search className="w-4 h-4 mr-2" /> Search</>}
            </Button>
          </div>
        </div>

        {/* Collection Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="text-lg font-bold">Collection</h3>
          </div>
          <div className="bg-white rounded-md border shadow-sm">
            <Table
              columns={collectionColumns}
              dataSource={reportData?.collections.items || []}
              rowKey="id"
              loading={loading}
              size="small"
              scroll={{ x: 700 }}
              pagination={false}
              summary={() =>
                reportData && reportData.collections.items.length > 0 ? (
                  <Table.Summary fixed>
                    <Table.Summary.Row className="font-bold bg-gray-50">
                      <Table.Summary.Cell index={0} colSpan={5} align="right">
                        <span className="font-bold">Total:</span>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right">
                        <span className="font-bold">{formatCurrency(reportData.collections.total)}</span>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                ) : null
              }
            />
          </div>
        </div>

        {/* Sales Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="text-lg font-bold">Sales</h3>
          </div>
          <div className="bg-white rounded-md border shadow-sm">
            <Table
              columns={salesColumns}
              dataSource={reportData?.sales.items || []}
              rowKey="id"
              loading={loading}
              size="small"
              scroll={{ x: 800 }}
              pagination={false}
              summary={() =>
                reportData && reportData.sales.items.length > 0 ? (
                  <Table.Summary fixed>
                    <Table.Summary.Row className="font-bold bg-gray-50">
                      <Table.Summary.Cell index={0} colSpan={6} align="right">
                        <span className="font-bold">Total:</span>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right">
                        <span className="font-bold">{formatCurrency(reportData.sales.total)}</span>
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
