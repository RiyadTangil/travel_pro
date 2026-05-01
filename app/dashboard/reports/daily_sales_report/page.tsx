"use client"

import { useState, useEffect, useCallback } from "react"
import { Table } from "antd"
import type { ColumnsType } from "antd/es/table"
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
import { useSearchParams } from "next/navigation"

interface SalesItem {
  id: string
  clientId: string
  date: string
  invoiceNo: string
  clientName: string
  category: string
  salesBy: string
  salesPrice: number
  costPrice: number
  profit: number
  collectAmount: number
  dueAmount: number
}

interface SalesReportData {
  items: SalesItem[]
  pagination: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
  totals: {
    salesPrice: number
    costPrice: number
    profit: number
    collectAmount: number
    dueAmount: number
  }
}

export default function SalesReportPage() {
  const searchParams = useSearchParams()
  const dailyParam = searchParams.get("daily")

  const [selectedClient, setSelectedClient] = useState<string>("")
  const [selectedEmployee, setSelectedEmployee] = useState<string>("")
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    if (dailyParam) {
      const parsedDate = parseISO(dailyParam)
      return { from: parsedDate, to: parsedDate }
    }
    return {
      from: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // First day of current month
      to: new Date(),
    }
  })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState<SalesReportData | null>(null)
  const [categories, setCategories] = useState<{ label: string; value: string }[]>([])
  const [clients, setClients] = useState<{ label: string; value: string }[]>([])
  const [employees, setEmployees] = useState<{ label: string; value: string }[]>([])

  // Fetch dropdown data using Promise.all
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [catRes, clientRes, empRes] = await Promise.all([
          fetch('/api/categories?pageSize=100'),
          fetch('/api/clients-manager?limit=1000'),
          fetch('/api/employees')
        ])

        if (catRes.ok) {
          const json = await catRes.json()
          setCategories((json.data || []).map((c: any) => ({ label: c.name, value: c.id })))
        }

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
      if (selectedCategory) params.append("categoryId", selectedCategory)
      if (dateRange?.from) params.append("dateFrom", format(dateRange.from, "yyyy-MM-dd"))
      if (dateRange?.to) params.append("dateTo", format(dateRange.to, "yyyy-MM-dd"))
      params.append("page", String(pageNum))
      params.append("pageSize", "20")

      const res = await fetch(`/api/reports/sales-report?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch report")
      const data = await res.json()
      setReportData(data)
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to load sales report",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [selectedClient, selectedEmployee, selectedCategory, dateRange])

  // Initial fetch
  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n)

  const columns: ColumnsType<SalesItem> = [
    {
      title: "SL",
      key: "sl",
      width: 52,
      render: (_: unknown, __: SalesItem, i: number) =>
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
      title: "Invoice No",
      dataIndex: "invoiceNo",
      key: "invoiceNo",
      width: 130,
      render: (v: string, row: SalesItem) => (
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
      render: (v: string, row: SalesItem) => (
        <Link
          href={`/dashboard/reports/client-ledger?clientId=${row.clientId}`}
          className="text-sky-500 hover:underline"
        >
          {v}
        </Link>
      ),
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      width: 120,
    },
    {
      title: "Sales By",
      dataIndex: "salesBy",
      key: "salesBy",
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
      title: "Cost Price",
      dataIndex: "costPrice",
      key: "costPrice",
      width: 110,
      align: "right" as const,
      render: (v: number) => <span className="font-medium">{fmt(v)}</span>,
    },
    {
      title: "Profit",
      dataIndex: "profit",
      key: "profit",
      width: 110,
      align: "right" as const,
      render: (v: number) => (
        <span className="font-medium text-green-600">{fmt(v)}</span>
      ),
    },
    {
      title: "Collect Amount",
      dataIndex: "collectAmount",
      key: "collectAmount",
      width: 130,
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
    <PageWrapper breadcrumbs={[{ label: "Reports", href: "/dashboard/reports" }, { label: "Daily Sales Report" }]}>
      <div className="px-4 space-y-4">
        {/* Top Buttons */}
        <div className="flex gap-2">
          <Button variant="outline" className="bg-sky-500 text-white hover:bg-sky-600 border-none" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
          <Button variant="outline" className="bg-sky-500 text-white hover:bg-sky-600 border-none">
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel Report
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4 items-end bg-white p-4 rounded-md shadow-sm border">
          <div className="space-y-2">
            <Label className="text-red-500 font-semibold">* <span className="text-gray-700">Select Client</span></Label>
            <ClearableSelect
              options={clients}
              value={selectedClient}
              onChange={setSelectedClient}
              placeholder="Select Client"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-red-500 font-semibold">* <span className="text-gray-700">Select Employee</span></Label>
            <ClearableSelect
              options={employees}
              value={selectedEmployee}
              onChange={setSelectedEmployee}
              placeholder="All"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-red-500 font-semibold">* <span className="text-gray-700">Select Category</span></Label>
            <ClearableSelect
              options={categories}
              value={selectedCategory}
              onChange={setSelectedCategory}
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

          <div className="md:col-span-4 lg:col-span-1 flex justify-start lg:justify-end">
            <Button onClick={() => fetchReport(1)} disabled={loading} className="bg-sky-500 hover:bg-sky-600 text-white px-8">
              {loading ? "Searching..." : <><Search className="w-4 h-4 mr-2" /> Search</>}
            </Button>
          </div>
        </div>

        {/* Report Table */}
        <div className="bg-white rounded-md border shadow-sm overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="text-base font-bold text-center">Sales Report</h3>
          </div>
          <Table<SalesItem>
            rowKey="id"
            columns={columns}
            dataSource={reportData?.items ?? []}
            loading={loading}
            scroll={{ x: scrollX }}
            className="border-none"
            locale={{ emptyText: loading ? "Loading…" : "No sales found for the selected criteria." }}
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
                    <Table.Summary.Cell index={2} align="right">{fmt(totals.costPrice)}</Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="right">
                      <span className="text-green-600">{fmt(totals.profit)}</span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={4} align="right">{fmt(totals.collectAmount)}</Table.Summary.Cell>
                    <Table.Summary.Cell index={5} align="right">
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
