"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import { useSession } from "next-auth/react"
import { DashboardHeader } from "@/components/dashboard/header"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Printer, ArrowLeft } from "lucide-react"
import { DateRangePickerWithPresets } from "@/components/ui/date-range-with-presets"
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

import { PaginationWithLinks } from "@/components/ui/pagination-with-links"

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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm print:hidden">
        <div className="mx-auto px-4 py-4">
          <DashboardHeader />
        </div>
      </header>

      <main className="flex-grow py-6 print:py-0">
        <div className="mb-4 px-4 print:hidden">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard/accounts">Accounts</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Transaction History</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

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
            <div className="bg-white rounded-md border shadow-sm print:border-none print:shadow-none">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-100 hover:bg-gray-100">
                    <TableHead className="w-12 font-bold text-gray-900">SL.</TableHead>
                    <TableHead className="font-bold text-gray-900">Date</TableHead>
                    <TableHead className="font-bold text-gray-900">Voucher No.</TableHead>
                    <TableHead className="font-bold text-gray-900">Account Name</TableHead>
                    <TableHead className="font-bold text-gray-900">Particulars</TableHead>
                    <TableHead className="font-bold text-gray-900">Tr.Type</TableHead>
                    <TableHead className="font-bold text-gray-900 text-right">Debit</TableHead>
                    <TableHead className="font-bold text-gray-900 text-right">Credit</TableHead>
                    <TableHead className="font-bold text-gray-900 text-right">Total Last Balance</TableHead>
                    <TableHead className="font-bold text-gray-900">Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, idx) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium text-gray-600">{(page - 1) * pageSize + idx + 1}</TableCell>
                      <TableCell className="text-gray-600 whitespace-nowrap">
                        {new Date(r.date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell className="text-gray-600">{r.voucherNo}</TableCell>
                      <TableCell className="text-gray-600">{r.accountName}</TableCell>
                      <TableCell className="text-gray-600">{r.particulars}</TableCell>
                      <TableCell className={cn("font-semibold uppercase", r.trType === "DEBIT" ? "text-red-500" : "text-green-500")}>
                        {r.trType}
                      </TableCell>
                      <TableCell className="text-right text-red-500 font-medium">
                        {r.debit > 0 ? r.debit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : ""}
                      </TableCell>
                      <TableCell className="text-right text-green-500 font-medium">
                        {r.credit > 0 ? r.credit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : ""}
                      </TableCell>
                      <TableCell className={cn("text-right font-medium", (r.totalLastBalance || 0) >= 0 ? "text-red-500" : "text-green-500")}>
                        {Math.abs(r.totalLastBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-gray-600 max-w-[200px] truncate" title={r.note}>{r.note}</TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                        {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : "No transactions found"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <PaginationWithLinks 
              totalCount={total}
              pageSize={pageSize}
              page={page}
              setPage={setPage}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
