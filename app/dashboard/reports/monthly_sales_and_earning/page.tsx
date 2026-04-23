"use client"

import { useState, useEffect, useCallback } from "react"
import { Table } from "antd"
import type { ColumnsType } from "antd/es/table"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { format } from "date-fns"
import { PageWrapper } from "@/components/shared/page-wrapper"
import { Search, Printer, FileSpreadsheet } from "lucide-react"
import { ClearableSelect } from "@/components/shared/clearable-select"
import { DateRangePickerWithPresets } from "@/components/shared/date-range-with-presets"
import { DateRange } from "react-day-picker"
import Link from "next/link"
import { toast } from "@/components/ui/use-toast"

interface SalesEarningItem {
  id: string
  clientId: string
  date: string
  invoiceNo: string
  clientName: string
  salesBy: string
  salesCategory: string
  salesPrice: number
  purchaseAmount: number
  clientDiscount: number
  serviceCharge: number
  earningAmount: number
  collectedAmount: number
  dueAmount: number
  status: string
}

interface SalesEarningReportData {
  items: SalesEarningItem[]
  pagination: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
  totals: {
    salesPrice: number
    purchaseAmount: number
    clientDiscount: number
    serviceCharge: number
    earningAmount: number
    collectedAmount: number
    dueAmount: number
  }
}

export default function MonthlySalesEarningPage() {
  const [selectedClient, setSelectedClient] = useState<string>("")
  const [selectedEmployee, setSelectedEmployee] = useState<string>("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState<SalesEarningReportData | null>(null)
  
  const [clients, setClients] = useState<{ label: string; value: string }[]>([])
  const [employees, setEmployees] = useState<{ label: string; value: string }[]>([])

  // Fetch dropdown data
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [clientRes, empRes] = await Promise.all([
          fetch('/api/clients-manager?limit=1000'),
          fetch('/api/employees')
        ])

        if (clientRes.ok) {
          const json = await clientRes.json()
          const clientOptions = (json.clients || []).map((c: any) => ({ 
            label: `${c.name} - (CL-${String(c.uniqueId || "").padStart(4, '0')})`, 
            value: c.id 
          }))
          setClients([{ label: "All", value: "" }, ...clientOptions])
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
      if (selectedClient) params.append("clientId", selectedClient)
      if (selectedEmployee) params.append("employeeId", selectedEmployee)
      if (dateRange?.from) params.append("dateFrom", format(dateRange.from, "yyyy-MM-dd"))
      if (dateRange?.to) params.append("dateTo", format(dateRange.to, "yyyy-MM-dd"))
      params.append("page", String(pageNum))
      params.append("pageSize", "20")

      const res = await fetch(`/api/reports/monthly-sales-earning?${params.toString()}`)
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
  }, [selectedClient, selectedEmployee, dateRange])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n)

  const columns: ColumnsType<SalesEarningItem> = [
    {
      title: "SL",
      key: "sl",
      width: 52,
      render: (_: unknown, __: SalesEarningItem, i: number) =>
        (page - 1) * 20 + i + 1,
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      width: 110,
      render: (v: string) => (v ? format(new Date(v), "dd MMM yyyy") : "—"),
    },
    {
      title: "Invoice No.",
      dataIndex: "invoiceNo",
      key: "invoiceNo",
      width: 130,
      render: (v: string, row: SalesEarningItem) => (
        <Link href={`/dashboard/invoices/${row.id}`} className="text-sky-500 hover:underline font-medium">
          {v}
        </Link>
      ),
    },
    {
      title: "Client Name",
      dataIndex: "clientName",
      key: "clientName",
      width: 170,
      render: (v: string, row: SalesEarningItem) => (
        <Link
          href={`/dashboard/reports/client-ledger?clientId=${row.clientId}`}
          className="text-sky-500 hover:underline"
        >
          {v}
        </Link>
      ),
    },
    {
      title: "Sales By",
      dataIndex: "salesBy",
      key: "salesBy",
      width: 130,
    },
    {
      title: "Sales Category",
      dataIndex: "salesCategory",
      key: "salesCategory",
      width: 130,
    },
    {
      title: "Sales Price",
      dataIndex: "salesPrice",
      key: "salesPrice",
      width: 120,
      align: "right" as const,
      render: (v: number) => <span className="font-medium">{fmt(v)}</span>,
    },
    {
      title: "Purchase Amt",
      dataIndex: "purchaseAmount",
      key: "purchaseAmount",
      width: 120,
      align: "right" as const,
      render: (v: number) => <span className="font-medium">{fmt(v)}</span>,
    },
    {
      title: "Client Disc.",
      dataIndex: "clientDiscount",
      key: "clientDiscount",
      width: 110,
      align: "right" as const,
      render: (v: number) => <span className="font-medium">{fmt(v)}</span>,
    },
    {
      title: "Svc Charge",
      dataIndex: "serviceCharge",
      key: "serviceCharge",
      width: 110,
      align: "right" as const,
      render: (v: number) => <span className="font-medium">{fmt(v)}</span>,
    },
    {
      title: "Earning Amt",
      dataIndex: "earningAmount",
      key: "earningAmount",
      width: 120,
      align: "right" as const,
      render: (v: number) => (
        <span className="font-medium text-green-600">{fmt(v)}</span>
      ),
    },
    {
      title: "Collected Amt",
      dataIndex: "collectedAmount",
      key: "collectedAmount",
      width: 125,
      align: "right" as const,
      render: (v: number) => <span className="font-medium">{fmt(v)}</span>,
    },
    {
      title: "Due Amount",
      dataIndex: "dueAmount",
      key: "dueAmount",
      width: 120,
      align: "right" as const,
      render: (v: number) => (
        <span className={`font-medium ${v > 0 ? "text-red-500" : "text-green-600"}`}>
          {v > 0 ? fmt(v) : "PAID"}
        </span>
      ),
    },
  ]

  const scrollX = columns.reduce((s, c) => s + ((c.width as number) || 120), 0)
  const totals  = reportData?.totals

  return (
    <PageWrapper breadcrumbs={[{ label: "Reports", href: "/dashboard/reports" }, { label: "Monthly Sales Earning" }]}>
      <div className="px-4 space-y-4">
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
            <Label className="text-gray-700 font-semibold">Select Sales By</Label>
            <ClearableSelect
              options={employees}
              value={selectedEmployee}
              onChange={setSelectedEmployee}
              placeholder="Select employee"
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

        {/* Report Table */}
        <div className="bg-white rounded-md border shadow-sm overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="text-base font-bold text-center">Monthly Sales Earning And Due</h3>
          </div>
          <Table<SalesEarningItem>
            rowKey="id"
            columns={columns}
            dataSource={reportData?.items ?? []}
            loading={loading}
            scroll={{ x: scrollX }}
            className="border-none"
            locale={{ emptyText: loading ? "Loading…" : "No records found for the selected criteria." }}
            pagination={{
              current: page,
              pageSize: 20,
              total: reportData?.pagination.total ?? 0,
              onChange: (p) => { setPage(p); fetchReport(p) },
              showSizeChanger: false,
              showTotal: (t) => `Total ${t} invoices`,
            }}
            summary={() =>
              totals ? (
                <Table.Summary fixed="bottom">
                  <Table.Summary.Row className="bg-gray-100 font-bold">
                    <Table.Summary.Cell index={0} colSpan={6} align="right">
                      TOTAL
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">{fmt(totals.salesPrice)}</Table.Summary.Cell>
                    <Table.Summary.Cell index={2} align="right">{fmt(totals.purchaseAmount)}</Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="right">{fmt(totals.clientDiscount)}</Table.Summary.Cell>
                    <Table.Summary.Cell index={4} align="right">{fmt(totals.serviceCharge)}</Table.Summary.Cell>
                    <Table.Summary.Cell index={5} align="right">
                      <span className="text-green-600">{fmt(totals.earningAmount)}</span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={6} align="right">{fmt(totals.collectedAmount)}</Table.Summary.Cell>
                    <Table.Summary.Cell index={7} align="right">
                      <span className="text-red-500">{fmt(totals.dueAmount)}</span>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              ) : null
            }
          />
        </div>
      </div>
    </PageWrapper>
  )
}
