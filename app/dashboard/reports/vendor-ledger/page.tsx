"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { Table } from "antd"
import type { ColumnsType } from "antd/es/table"
import { PageWrapper } from "@/components/shared/page-wrapper"
import { LedgerEntityCard } from "@/components/shared/ledger-entity-card"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import type { DateRange } from "react-day-picker"
import { VendorSelection } from "@/components/shared/vendor-selection"
import FilterToolbar from "@/components/shared/filter-toolbar"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"


interface LedgerEntry {
  id: string
  date: string
  particulars: string
  voucherNo: string
  paxName: string
  pnr: string
  ticketNo: string
  route: string
  payType: string
  debit: number
  credit: number
  balance: number
  note: string
}

interface EntityInfo {
  name: string
  mobile: string
  email: string
  address: string
}

interface LedgerData {
  entries: LedgerEntry[]
  totalDebit: number
  totalCredit: number
  closingBalance: number
  entity: EntityInfo | null
}


function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Math.abs(n))
}

function balanceColor(n: number) {
  return n > 0 ? "text-red-500" : n < 0 ? "text-green-500" : "text-gray-500"
}

function balanceText(n: number) {
  if (n > 0) return `Due ${formatCurrency(n)}`
  if (n < 0) return `Adv ${formatCurrency(Math.abs(n))}`
  return "0"
}

export default function VendorLedgerPage() {
  const searchParams  = useSearchParams()
  const urlVendorId   = searchParams.get("vendorId") ?? ""

  const [vendorId,   setVendorId]   = useState(urlVendorId)
  const [dateRange,  setDateRange]  = useState<DateRange | undefined>()
  const [loading,    setLoading]    = useState(false)
  const [ledgerData, setLedgerData] = useState<LedgerData | null>(null)

  const autoFetchedRef = useRef(false)

  // Auto-fetch once when the page was opened via URL with a vendorId
  useEffect(() => {
    if (urlVendorId && !autoFetchedRef.current) {
      autoFetchedRef.current = true
      fetchLedger()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlVendorId])

  const fetchLedger = async () => {
    if (!vendorId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ vendorId })
      if (dateRange?.from) params.append("dateFrom", format(dateRange.from, "yyyy-MM-dd"))
      if (dateRange?.to) params.append("dateTo", format(dateRange.to, "yyyy-MM-dd"))
      const res = await fetch(`/api/reports/vendor-ledger?${params}`)
      const data = await res.json()
      if (res.ok) setLedgerData(data)
      else console.error(data.error)
    } catch (e) {
      console.error("Failed to fetch ledger", e)
    } finally {
      setLoading(false)
    }
  }


  const columns: ColumnsType<LedgerEntry> = [
    {
      title: "SL",
      key: "sl",
      width: 56,
      render: (_: unknown, __: LedgerEntry, i: number) => i + 1,
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      width: 110,
      render: (v: string) => (v ? format(new Date(v), "dd MMM yyyy") : "—"),
    },
    {
      title: "Particulars",
      dataIndex: "particulars",
      key: "particulars",
      width: 160,
    },
    {
      title: "Voucher No.",
      dataIndex: "voucherNo",
      key: "voucherNo",
      width: 120,
      render: (v: string) => <span className="font-medium">{v || "—"}</span>,
    },
    {
      title: "Pax Name",
      dataIndex: "paxName",
      key: "paxName",
      width: 150,
      ellipsis: true,
      render: (v: string) => v || "—",
    },
    {
      title: "PNR",
      dataIndex: "pnr",
      key: "pnr",
      width: 100,
      render: (v: string) => v || "—",
    },
    {
      title: "Ticket No.",
      dataIndex: "ticketNo",
      key: "ticketNo",
      width: 120,
      render: (v: string) => v || "—",
    },
    {
      title: "Route",
      dataIndex: "route",
      key: "route",
      width: 130,
      render: (v: string) => v || "—",
    },
    {
      title: "Pay Type",
      dataIndex: "payType",
      key: "payType",
      width: 140,
      render: (v: string) => v || "—",
    },
    {
      title: "Debit",
      dataIndex: "debit",
      key: "debit",
      width: 110,
      align: "right" as const,
      render: (v: number) =>
        v > 0 ? <span className="text-red-600 font-medium">{formatCurrency(v)}</span> : "",
    },
    {
      title: "Credit",
      dataIndex: "credit",
      key: "credit",
      width: 110,
      align: "right" as const,
      render: (v: number) =>
        v > 0 ? <span className="text-green-600 font-medium">{formatCurrency(v)}</span> : "",
    },
    {
      title: "Balance",
      dataIndex: "balance",
      key: "balance",
      width: 140,
      align: "right" as const,
      render: (v: number) => (
        <span className={cn("font-bold whitespace-nowrap", balanceColor(v))}>
          {balanceText(v)}
        </span>
      ),
    },
    {
      title: "Note",
      dataIndex: "note",
      key: "note",
      ellipsis: true,
      width: 150,
      render: (v: string) => v || "",
    },
  ]

  const scrollX = columns.reduce((sum, col) => sum + ((col.width as number) || 120), 0)

  const entity = ledgerData?.entity

  return (
    <PageWrapper
      breadcrumbs={[
        { label: "Reports", href: "/dashboard/reports" },
        { label: "Vendor Ledger" },
      ]}
    >
      <div className="mx-4 min-w-0 max-w-full space-y-4">

        {entity && (
          <LedgerEntityCard
            title="Vendor Details"
            rows={[
              { label: "Name",    value: entity.name    },
              { label: "Mobile",  value: entity.mobile  },
              { label: "Email",   value: entity.email   },
              { label: "Address", value: entity.address },
            ]}
          />
        )}

        <FilterToolbar
          showDateRange
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          showRefresh={false}
          onRefresh={fetchLedger}
          filterExtrasBefore={
            <VendorSelection
              value={vendorId}
              onChange={setVendorId}
              placeholder="Filter by Vendor"
              className="w-64"
            />
          }
          filterExtras={
            <Button
              onClick={fetchLedger}
              disabled={!vendorId || loading}
              className="bg-sky-500 hover:bg-sky-600"
            >
              <Search className="w-4 h-4 mr-2" />
              {loading ? "Loading..." : "Search"}
            </Button>
          }
        />

        <div className="min-w-0 max-w-full bg-white rounded-md border shadow-sm overflow-hidden">
          <Table<LedgerEntry>
            rowKey="id"
            columns={columns}
            dataSource={ledgerData?.entries ?? []}
            loading={loading}
            scroll={{ x: scrollX }}
            pagination={false}
            className="border-none"
            locale={{
              emptyText: loading
                ? "Loading..."
                : "Select a vendor and click Search to view the ledger",
            }}
            summary={() =>
              ledgerData ? (
                <Table.Summary fixed="bottom">
                  <Table.Summary.Row className="bg-gray-100">
                    <Table.Summary.Cell index={0} colSpan={9} align="right">
                      <span className="font-bold">Total</span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <span className="text-red-600 font-bold">
                        {formatCurrency(ledgerData.totalDebit)}
                      </span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} align="right">
                      <span className="text-green-600 font-bold">
                        {formatCurrency(ledgerData.totalCredit)}
                      </span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="right">
                      <span className={cn("font-bold whitespace-nowrap", balanceColor(ledgerData.closingBalance))}>
                        {balanceText(ledgerData.closingBalance)}
                      </span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={4} />
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
