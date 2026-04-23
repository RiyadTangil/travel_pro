"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Table } from "antd"
import type { ColumnsType } from "antd/es/table"
import { PageWrapper } from "@/components/shared/page-wrapper"
import { ClearableSelect } from "@/components/shared/clearable-select"
import FilterToolbar from "@/components/shared/filter-toolbar"
import { Button } from "@/components/ui/button"
import { DateInput } from "@/components/ui/date-input"
import { format } from "date-fns"
import { Search, Printer, FileSpreadsheet } from "lucide-react"
import { useInvoiceLookups } from "@/hooks/useInvoiceLookups"
import { cn } from "@/lib/utils"
import Link from "next/link"

type VendorRow = {
  vendorId: string
  name: string
  mobile: string
  email: string
  presentDue: number
  presentAdvance: number
  lastBalance: number
}

function formatAmount(n: number) {
  return new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

export default function TotalDueAdvanceVendorPage() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const { lookups }  = useInvoiceLookups()

  const urlVendorId = searchParams.get("vendorId") ?? "all"
  const urlDate     = searchParams.get("date") ?? ""

  const [selectedVendor, setSelectedVendor] = useState(urlVendorId)
  const [date,    setDate]    = useState<Date | undefined>(urlDate ? new Date(urlDate) : new Date())
  const [loading, setLoading] = useState(false)
  const [rows,    setRows]    = useState<VendorRow[]>([])

  const vendorOptions = [
    { value: "all", label: "ALL" },
    ...(lookups?.vendors ?? []).map((v) => ({ value: v.id, label: v.name })),
  ]

  const autoFetchedRef = useRef(false)

  // Auto-fetch on mount when arriving from a URL with date param
  useEffect(() => {
    if (urlDate && lookups && !autoFetchedRef.current) {
      autoFetchedRef.current = true
      handleSearch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!lookups])

  const handleSearch = async () => {
    if (!date) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedVendor && selectedVendor !== "all") params.set("vendorId", selectedVendor)
      params.set("date", format(date, "yyyy-MM-dd"))

      router.replace(`?${params.toString()}`, { scroll: false })

      const res  = await fetch(`/api/reports/total-due-advance/vendors?${params.toString()}`)
      const data = await res.json()
      setRows(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const totalDue     = rows.reduce((s, r) => s + r.presentDue,     0)
  const totalAdvance = rows.reduce((s, r) => s + r.presentAdvance, 0)

  const columns: ColumnsType<VendorRow> = [
    {
      title: "SL",
      key: "sl",
      width: 56,
      render: (_: unknown, __: VendorRow, i: number) => i + 1,
    },
    {
      title: "Vendor Name",
      dataIndex: "name",
      key: "name",
      width: 200,
      render: (name: string, row: VendorRow) => (
        <Link
          href={`/dashboard/reports/vendor-ledger?vendorId=${row.vendorId}`}
          className="text-blue-500 hover:underline font-medium"
        >
          {name}
        </Link>
      ),
    },
    {
      title: "Mobile No.",
      dataIndex: "mobile",
      key: "mobile",
      width: 140,
      render: (v: string) => v || "—",
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: 180,
      render: (v: string) => v || "—",
    },
    {
      title: "Present Due",
      dataIndex: "presentDue",
      key: "presentDue",
      width: 130,
      align: "right" as const,
      render: (v: number) =>
        v > 0 ? <span className="text-red-500 font-medium">{formatAmount(v)}</span> : "—",
    },
    {
      title: "Present Advance",
      dataIndex: "presentAdvance",
      key: "presentAdvance",
      width: 140,
      align: "right" as const,
      render: (v: number) =>
        v > 0 ? <span className="text-green-500 font-medium">{formatAmount(v)}</span> : "—",
    },
    {
      title: "Last Balance",
      dataIndex: "lastBalance",
      key: "lastBalance",
      width: 130,
      align: "right" as const,
      render: (v: number) => (
        <span className={cn("font-medium", v > 0 ? "text-red-500" : v < 0 ? "text-green-500" : "text-gray-400")}>
          {v !== 0 ? formatAmount(Math.abs(v)) : "—"}
        </span>
      ),
    },
  ]

  const scrollX = columns.reduce((s, col) => s + ((col.width as number) || 120), 0)

  return (
    <PageWrapper
      breadcrumbs={[
        { label: "Reports", href: "/dashboard/reports" },
        { label: "Total Due / Advance (Vendors)" },
      ]}
    >
      <div className="mx-4 min-w-0 max-w-full space-y-4">
        <FilterToolbar
          showRefresh={false}
          onRefresh={handleSearch}
          filterExtrasBefore={
            <ClearableSelect
              options={vendorOptions}
              value={selectedVendor}
              onChange={(v) => setSelectedVendor(v || "all")}
              placeholder="Filter by Vendor"
              className="w-64"
            />
          }
          filterExtras={
            <div className="flex items-center gap-2">
              <DateInput
                value={date}
                onChange={setDate}
                placeholder="Pick a date"
                className="w-44"
              />
              <Button
                onClick={handleSearch}
                disabled={!date || loading}
                className="bg-sky-500 hover:bg-sky-600"
              >
                <Search className="w-4 h-4 mr-2" />
                {loading ? "Loading..." : "Search"}
              </Button>
            </div>
          }
        >
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="bg-sky-500 hover:bg-sky-600 text-white border-none">
              <Printer className="w-4 h-4 mr-1" /> Print
            </Button>
            <Button variant="outline" size="sm" className="bg-sky-500 hover:bg-sky-600 text-white border-none">
              <FileSpreadsheet className="w-4 h-4 mr-1" /> Excel
            </Button>
          </div>
        </FilterToolbar>

        {rows.length > 0 && (
          <p className="text-sm text-gray-500">
            Total records: <span className="font-semibold text-gray-700">{rows.length}</span>
          </p>
        )}

        <div className="min-w-0 max-w-full bg-white rounded-md border shadow-sm overflow-hidden">
          <Table<VendorRow>
            rowKey="vendorId"
            columns={columns}
            dataSource={rows}
            loading={loading}
            scroll={{ x: scrollX }}
            pagination={false}
            className="border-none"
            locale={{
              emptyText: loading ? "Loading..." : "Select a date and click Search",
            }}
            summary={() =>
              rows.length > 0 ? (
                <Table.Summary fixed="bottom">
                  <Table.Summary.Row className="bg-gray-100">
                    <Table.Summary.Cell index={0} colSpan={4} align="right">
                      <span className="font-bold">Total Due &amp; Advance</span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <span className="text-red-500 font-bold">{formatAmount(totalDue)}</span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} align="right">
                      <span className="text-green-500 font-bold">{formatAmount(totalAdvance)}</span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3} />
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
