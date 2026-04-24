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
            label: p.product_name || p.name,
            value: String(p.id || p._id)
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
      if (selectedProduct) params.append("productId", selectedProduct)
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
      toast({ title: "Error", description: "Failed to load report", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [selectedEmployee, selectedProduct, dateRange])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount)

  const columns: ColumnsType<ItemSalesmanItem> = [
    {
      title: "SL.",
      key: "sl",
      width: 60,
      render: (_: any, __: any, index: number) => (page - 1) * 20 + index + 1,
    },
    {
      title: "Sales Date",
      dataIndex: "salesDate",
      key: "salesDate",
      width: 120,
      render: (v: string) => v ? format(new Date(v), "dd-MM-yyyy") : "-",
    },
    {
      title: "Invoice No",
      dataIndex: "invoiceNo",
      key: "invoiceNo",
      width: 140,
      render: (v: string, row: ItemSalesmanItem) => (
        <Link href={`/dashboard/invoices/${row.invoiceId}`} className="text-sky-500 hover:underline">
          {v}
        </Link>
      ),
    },
    {
      title: "Product Name",
      dataIndex: "productName",
      key: "productName",
      width: 160,
    },
    {
      title: "Client Name",
      dataIndex: "clientName",
      key: "clientName",
      width: 160,
      render: (v: string, row: ItemSalesmanItem) => (
        <Link href={`/dashboard/reports/client-ledger?clientId=${row.clientId}`} className="text-sky-500 hover:underline">
          {v}
        </Link>
      ),
    },
    {
      title: "Sales By",
      dataIndex: "salesBy",
      key: "salesBy",
      width: 140,
    },
    {
      title: "Sales Amount",
      dataIndex: "salesAmount",
      key: "salesAmount",
      align: "right",
      width: 130,
      render: (v: number) => formatCurrency(v),
    },
  ]

  return (
    <PageWrapper breadcrumbs={[{ label: "Reports", href: "/dashboard/reports" }, { label: "Item & Salesman Wise Report" }]}>
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
            <Label className="text-gray-700 font-semibold">Select Sales By</Label>
            <ClearableSelect options={employees} value={selectedEmployee} onChange={setSelectedEmployee} placeholder="All" />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 font-semibold">Select Product</Label>
            <ClearableSelect options={products} value={selectedProduct} onChange={setSelectedProduct} placeholder="All" />
          </div>

          <div className="space-y-2">
            <Label className="text-red-500 font-semibold">* <span className="text-gray-700">Date Range</span></Label>
            <DateRangePickerWithPresets date={dateRange} onDateChange={setDateRange} className="w-full" />
          </div>

          <div className="flex justify-start">
            <Button onClick={() => fetchReport(1)} disabled={loading} className="bg-sky-500 hover:bg-sky-600 text-white w-full sm:w-auto px-8">
              {loading ? "Searching..." : <><Search className="w-4 h-4 mr-2" /> Search</>}
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-md border shadow-sm">
          <div className="p-4 border-b">
            <h3 className="text-lg font-bold text-center">Item & Sales Man-Wise Sales Report</h3>
          </div>
          <Table
            columns={columns}
            dataSource={reportData?.items || []}
            rowKey="id"
            loading={loading}
            size="small"
            scroll={{ x: 800 }}
            pagination={{
              current: page,
              pageSize: 20,
              total: reportData?.pagination.total || 0,
              showSizeChanger: false,
              showTotal: (total) => `Total ${total} records`,
              onChange: (p) => fetchReport(p),
            }}
            summary={() =>
              reportData && reportData.items.length > 0 ? (
                <Table.Summary fixed>
                  <Table.Summary.Row className="font-bold bg-gray-50">
                    <Table.Summary.Cell index={0} colSpan={6} align="right">
                      <span className="uppercase font-bold text-base">Total:</span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <span className="font-bold text-base">{formatCurrency(reportData.totals.salesAmount)}</span>
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
