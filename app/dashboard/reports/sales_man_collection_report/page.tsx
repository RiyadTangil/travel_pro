"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { PageWrapper } from "@/components/shared/page-wrapper"
import { format } from "date-fns"
import { Search, Printer, FileSpreadsheet } from "lucide-react"
import { ClearableSelect } from "@/components/shared/clearable-select"
import { DateRangePickerWithPresets } from "@/components/shared/date-range-with-presets"
import { DateRange } from "react-day-picker"
import Link from "next/link"
import { toast } from "@/components/ui/use-toast"
import { Table } from "antd"
import type { ColumnsType } from "antd/es/table"

interface SalesmanCollectionItem {
  id: string
  date: string
  invoiceNo: string
  clientName: string
  clientId?: string
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
      toast({ title: "Error", description: "Failed to load report", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [selectedSalesman, dateRange])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount)

  const columns: ColumnsType<SalesmanCollectionItem> = [
    {
      title: "SL.",
      key: "sl",
      width: 60,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      width: 110,
      render: (v: string) => v ? format(new Date(v), "dd-MM-yyyy") : "-",
    },
    {
      title: "Invoice No",
      dataIndex: "invoiceNo",
      key: "invoiceNo",
      width: 140,
      render: (v: string, row: SalesmanCollectionItem) => (
        <Link href={`/dashboard/invoices/${row.id}`} className="text-sky-500 hover:underline">
          {v}
        </Link>
      ),
    },
    {
      title: "Client Name",
      dataIndex: "clientName",
      key: "clientName",
      width: 160,
      render: (v: string, row: SalesmanCollectionItem) =>
        row.clientId ? (
          <Link href={`/dashboard/reports/client-ledger?clientId=${row.clientId}`} className="text-sky-500 hover:underline">
            {v}
          </Link>
        ) : v,
    },
    {
      title: "Sales By",
      dataIndex: "salesBy",
      key: "salesBy",
      width: 140,
    },
    {
      title: "Sales Price",
      dataIndex: "salesPrice",
      key: "salesPrice",
      align: "right",
      width: 120,
      render: (v: number) => formatCurrency(v),
    },
    {
      title: "Collected Amount",
      dataIndex: "collectedAmount",
      key: "collectedAmount",
      align: "right",
      width: 140,
      render: (v: number) => formatCurrency(v),
    },
    {
      title: "Due",
      dataIndex: "due",
      key: "due",
      align: "right",
      width: 110,
      render: (v: number) => <span className="text-red-500 font-medium">{formatCurrency(v)}</span>,
    },
  ]

  return (
    <PageWrapper breadcrumbs={[{ label: "Reports", href: "/dashboard/reports" }, { label: "Salesman Collection Report" }]}>
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
            <Label className="text-gray-700 font-semibold">Select Sales Man</Label>
            <ClearableSelect options={employees} value={selectedSalesman} onChange={setSelectedSalesman} placeholder="All" />
          </div>

          <div className="space-y-2">
            <Label className="text-red-500 font-semibold">* <span className="text-gray-700">Date Range</span></Label>
            <DateRangePickerWithPresets date={dateRange} onDateChange={setDateRange} className="w-full" />
          </div>

          <div className="flex justify-start">
            <Button onClick={fetchReport} disabled={loading} className="bg-sky-500 hover:bg-sky-600 text-white w-full sm:w-auto px-8">
              {loading ? "Searching..." : <><Search className="w-4 h-4 mr-2" /> Search</>}
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-md border shadow-sm">
          <div className="p-4 border-b">
            <h3 className="text-lg font-bold text-center">Sales Man Wise Collection & Due</h3>
          </div>
          <Table
            columns={columns}
            dataSource={reportData?.items || []}
            rowKey="id"
            loading={loading}
            size="small"
            scroll={{ x: 900 }}
            pagination={false}
            summary={() =>
              reportData && reportData.items.length > 0 ? (
                <Table.Summary fixed>
                  <Table.Summary.Row className="font-bold bg-gray-50">
                    <Table.Summary.Cell index={0} colSpan={5} align="right">
                      <span className="font-bold uppercase">Total:</span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <span className="font-bold">{formatCurrency(reportData.totals.salesPrice)}</span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} align="right">
                      <span className="font-bold">{formatCurrency(reportData.totals.collectedAmount)}</span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="right">
                      <span className="font-bold text-red-500">{formatCurrency(reportData.totals.due)}</span>
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
