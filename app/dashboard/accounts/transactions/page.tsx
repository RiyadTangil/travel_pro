"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import { useSession } from "next-auth/react"
import { PageWrapper } from "@/components/shared/page-wrapper"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, Tag } from "antd"
import { Loader2, Printer, ArrowLeft } from "lucide-react"
import { DateRangePickerWithPresets } from "@/components/shared/date-range-with-presets"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DateRange } from "react-day-picker"
import Link from "next/link"
import { cn } from "@/lib/utils"

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

  // Fetch Accounts
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await client.get("/api/accounts?page=1&pageSize=100")
        const items = res.data?.items || []
        setAccounts(items.map((i: any) => ({ 
          id: String(i.id || i._id), 
          name: i.bankName ? `${i.name} (${i.bankName})` : String(i.name || "")
        })))
      } catch { }
    }
    fetchAccounts()
  }, [session])

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("pageSize", String(pageSize))
      
      if (accountId && accountId !== "all") {
        params.set("accountId", accountId)
      }
      
      if (dateRange?.from) {
        params.set("dateFrom", dateRange.from.toISOString().slice(0, 10))
      }
      if (dateRange?.to) {
        params.set("dateTo", dateRange.to.toISOString().slice(0, 10))
      }
      
      const res = await client.get(`/api/client-transactions?${params.toString()}`)
      const data = res.data
      const items = data?.items || []
      const pag = data?.pagination || {}
      
      setRows(items)
      setTotal(Number(pag?.total || 0))
    } catch (e) {
      console.error(e)
    } finally { 
      setLoading(false) 
    }
  }

  useEffect(() => { load() }, [session, page, pageSize, accountId, dateRange])

  const handlePrint = () => {
    window.print()
  }

  const columns = [
    {
      title: "SL.",
      key: "sl",
      width: 60,
      render: (_: any, __: any, index: number) => (page - 1) * pageSize + index + 1,
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (date: string) => new Date(date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' }),
    },
    {
      title: "Voucher No.",
      dataIndex: "voucherNo",
      key: "voucherNo",
    },
    {
      title: "Account Name",
      dataIndex: "accountName",
      key: "accountName",
    },
    {
      title: "Particulars",
      dataIndex: "particulars",
      key: "particulars",
    },
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
      render: (val: number) => val > 0 ? val.toLocaleString() : "-",
    },
    {
      title: "Credit",
      dataIndex: "credit",
      key: "credit",
      align: "right" as const,
      render: (val: number) => val > 0 ? val.toLocaleString() : "-",
    },
    {
      title: "Total Last Balance",
      dataIndex: "totalLastBalance",
      key: "totalLastBalance",
      align: "right" as const,
      render: (val: number) => <span className="font-bold">{val?.toLocaleString()}</span>,
    },
    {
      title: "Note",
      dataIndex: "note",
      key: "note",
      ellipsis: true,
      render: (text: string) => <span title={text}>{text}</span>,
    },
  ]

  return (
    <PageWrapper breadcrumbs={[{ label: "Accounts", href: "/dashboard/accounts" }, { label: "Transaction History" }]}>
        <div className="mx-4 mb-4 flex justify-between items-center print:hidden">
            <div className="flex items-center gap-2">
               <Link href="/dashboard/accounts">
                 <Button className="bg-sky-500 hover:bg-sky-600">
                   <ArrowLeft className="w-4 h-4 mr-2" /> Return to Accounts List
                 </Button>
               </Link>
               <Button onClick={handlePrint} className="bg-sky-500 hover:bg-sky-600">
                 <Printer className="w-4 h-4 mr-2" /> Print
               </Button>
            </div>
            <div className="flex items-center gap-2">
               <DateRangePickerWithPresets 
                 date={dateRange}
                 onDateChange={setDateRange}
                 className="bg-white"
               />
               <Select value={accountId} onValueChange={setAccountId}>
                 <SelectTrigger className="w-[200px] bg-white">
                   <SelectValue placeholder="All" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">All</SelectItem>
                   {accounts.map(acc => (
                     <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                   ))}
                 </SelectContent>
               </Select>
            </div>
        </div>

        <Card className="mx-4 border-none shadow-none bg-transparent print:mx-0">
          <CardContent className="p-0">
            <div className="bg-white rounded-md border shadow-sm print:border-none print:shadow-none overflow-hidden">
              <Table
                columns={columns}
                dataSource={rows}
                rowKey="id"
                loading={loading}
                pagination={{
                  current: page,
                  pageSize: pageSize,
                  total: total,
                  onChange: (p, ps) => {
                    setPage(p)
                    setPageSize(ps)
                  },
                  showSizeChanger: true,
                  showTotal: (total) => `Total ${total} items`,
                }}
                className="border-none"
              />
            </div>
          </CardContent>
        </Card>
    </PageWrapper>
  )
}
