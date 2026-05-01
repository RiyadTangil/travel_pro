"use client"

import { useCallback, useEffect, useState } from "react"
import axios from "axios"
import { useSession } from "next-auth/react"
import { PageWrapper } from "@/components/shared/page-wrapper"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, Tag } from "antd"
import { Printer, ArrowLeft } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DateRange } from "react-day-picker"
import Link from "next/link"
import FilterToolbar from "@/components/shared/filter-toolbar"

type TransactionRow = {
  id: string
  date: string
  voucherNo: string
  accountName: string
  particulars: string
  trType: "DEBIT" | "CREDIT"
  debit: number
  credit: number
  totalLastBalance: number
  note: string
}

type ClientTransactionApiItem = {
  _id: string
  date: string
  voucherNo: string
  accountName: string
  direction: string
  amount: number
  lastTotalAmount: number | null
  note: string
  transactionType?: string
  invoiceType?: string
}

function toTransactionRow(t: ClientTransactionApiItem): TransactionRow {
  const isReceive = String(t.direction) === "receiv"
  const isPayout = String(t.direction) === "payout"
  const trType: "DEBIT" | "CREDIT" = isReceive ? "CREDIT" : "DEBIT"
  const amount = Number(t.amount) || 0
  const voucher = String(t.voucherNo || "")
  const particular =
    voucher.startsWith("MR")
      ? "Money receipt"
      : voucher.startsWith("EX")
        ? "Vendor Payment"
        : t.invoiceType === "OPENING_BALANCE"
          ? "Opening Balance"
          : "Transaction"
  return {
    id: t._id,
    date: t.date,
    voucherNo: voucher,
    accountName: t.accountName || "",
    particulars: t.note || particular,
    trType,
    debit: isPayout ? amount : 0,
    credit: isReceive ? amount : 0,
    totalLastBalance: t.lastTotalAmount != null ? Number(t.lastTotalAmount) : 0,
    note: t.note || "",
  }
}

export default function TransactionHistoryPage() {
  const { data: session } = useSession()
  const [rows, setRows] = useState<TransactionRow[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [accountId, setAccountId] = useState<string>("all")
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([])

  const client = axios.create({
    baseURL: "",
    headers: { "x-company-id": session?.user?.companyId ?? "" },
  })

  useEffect(() => {
    const fetchAccounts = async () => {
      const companyId = session?.user?.companyId
      if (!companyId) return
      try {
        const res = await client.get("/api/accounts?page=1&pageSize=100", {
          headers: { "x-company-id": String(companyId) },
        })
        const items = res.data?.items || []
        setAccounts(
          items.map((i: any) => ({
            id: String(i.id || i._id),
            name: i.bankName ? `${i.name} (${i.bankName})` : String(i.name || ""),
          }))
        )
      } catch {}
    }
    fetchAccounts()
  }, [session?.user?.companyId])

  const load = useCallback(async () => {
    const companyId = session?.user?.companyId
    if (!companyId) {
      setRows([])
      setTotal(0)
      return
    }
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("pageSize", String(pageSize))
      if (accountId && accountId !== "all") params.set("accountId", accountId)
      if (dateRange?.from) params.set("dateFrom", dateRange.from.toISOString().slice(0, 10))
      if (dateRange?.to) params.set("dateTo", dateRange.to.toISOString().slice(0, 10))

      const {data} = await client.get(`/api/client-transactions?${params.toString()}`, {
        headers: { "x-company-id": String(companyId) },
      })
      const items = (data?.data?.items || []) as ClientTransactionApiItem[]
      const pag = data?.pagination || {}
      setRows(items.map(toTransactionRow))
      setTotal(Number(pag?.total || 0))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [session?.user?.companyId, page, pageSize, accountId, dateRange])

  useEffect(() => {
    if (session) load()
  }, [load, session])

  const handlePrint = () => {
    window.print()
  }

  const columns = [
    {
      title: "SL.",
      key: "sl",
      width: 60,
      render: (_: unknown, __: TransactionRow, index: number) => (page - 1) * pageSize + index + 1,
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (date: string) =>
        new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    },
    { title: "Voucher No.", dataIndex: "voucherNo", key: "voucherNo" },
    { title: "Account Name", dataIndex: "accountName", key: "accountName" },
    { title: "Particulars", dataIndex: "particulars", key: "particulars" },
    {
      title: "Tr.Type",
      dataIndex: "trType",
      key: "trType",
      render: (type: string) => (
        <Tag color={type === "DEBIT" ? "red" : "green"} className="font-bold">
          {type}
        </Tag>
      ),
    },
    {
      title: "Debit",
      dataIndex: "debit",
      key: "debit",
      align: "right" as const,
      render: (val: number) => (val > 0 ? val.toLocaleString() : "—"),
    },
    {
      title: "Credit",
      dataIndex: "credit",
      key: "credit",
      align: "right" as const,
      render: (val: number) => (val > 0 ? val.toLocaleString() : "—"),
    },
    {
      title: "Total Last Balance",
      dataIndex: "totalLastBalance",
      key: "totalLastBalance",
      align: "right" as const,
      render: (val: number) => <span className="font-bold tabular-nums">{val?.toLocaleString()}</span>,
    },
    {
      title: "Note",
      dataIndex: "note",
      key: "note",
      ellipsis: true,
      render: (text: string) => <span title={text}>{text || "—"}</span>,
    },
  ]

  return (
    <PageWrapper breadcrumbs={[{ label: "Accounts", href: "/dashboard/accounts" }, { label: "Transaction History" }]}>
      <div className="mx-4 mb-4 space-y-4 print:hidden">
        <FilterToolbar
          showDateRange
          dateRange={dateRange}
          onDateRangeChange={(r) => {
            setPage(1)
            setDateRange(r)
          }}
          showSearch={false}
          showRefresh
          onRefresh={load}
          filterExtras={
            <Select
              value={accountId}
              onValueChange={(v) => {
                setPage(1)
                setAccountId(v)
              }}
            >
              <SelectTrigger className="w-[220px] bg-white h-10">
                <SelectValue placeholder="Account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All accounts</SelectItem>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
          className="flex-1"
        >
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Link href="/dashboard/accounts">
              <Button type="button" className="bg-sky-500 hover:bg-sky-600">
                <ArrowLeft className="w-4 h-4 mr-2" /> Return to Accounts List
              </Button>
            </Link>
            <Button type="button" onClick={handlePrint} className="bg-sky-500 hover:bg-sky-600">
              <Printer className="w-4 h-4 mr-2" /> Print
            </Button>
          </div>
        </FilterToolbar>
      </div>

      <Card className="mx-4 border-none shadow-none bg-transparent print:mx-0">
        <CardContent className="p-0">
          <div className="bg-white rounded-md border shadow-sm print:border-none print:shadow-none overflow-hidden">
            <Table<TransactionRow>
              columns={columns}
              dataSource={rows}
              rowKey="id"
              loading={loading}
              pagination={{
                current: page,
                pageSize,
                total,
                onChange: (p, ps) => {
                  setPage(p)
                  setPageSize(ps)
                },
                showSizeChanger: true,
                showTotal: (t) => `Total ${t} items`,
              }}
              className="border-none"
              scroll={{ x: 1200 }}
              locale={{ emptyText: loading ? "Loading..." : "No transactions found." }}
            />
          </div>
        </CardContent>
      </Card>
    </PageWrapper>
  )
}
