"use client"

import { useEffect, useMemo, useState } from "react"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import ExpenseModal from "@/components/expenses/ExpenseModal"
import { DateInput } from "@/components/ui/date-input"
import { Input } from "@/components/ui/input"

type ExpenseRow = {
  id: string
  date: string
  voucherNo: string
  accountName: string
  totalAmount: number
  items: Array<{ headId: string; headName: string; amount: number }>
  paymentMethod: string
  accountId: string
  note?: string
}

export default function ExpenseHistoryPage() {
  const { data: session } = useSession()
  const [rows, setRows] = useState<ExpenseRow[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [search, setSearch] = useState<string>("")

  const [openAdd, setOpenAdd] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [editingRow, setEditingRow] = useState<ExpenseRow | null>(null)

  const client = axios.create({
    baseURL: "",
    headers: { "x-company-id": session?.user?.companyId ?? "" },
  })

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("pageSize", String(pageSize))
      if (search) params.set("search", search)
      if (startDate) params.set("dateFrom", startDate)
      if (endDate) params.set("dateTo", endDate)
      
      const res = await client.get(`/api/expenses?${params.toString()}`)
      const data = res.data
      const items: ExpenseRow[] = Array.isArray(data?.items) ? data.items : (Array.isArray(data?.data?.items) ? data.data.items : [])
      const pag = data?.pagination || data?.data?.pagination || {}
      
      setRows(items)
      setTotal(Number(pag?.total || 0))
      setPage(Number(pag?.page || page))
      setPageSize(Number(pag?.pageSize || pageSize))
    } catch { } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [session]) // Reload when session loads

  const filtered = useMemo(() => {
    // Client-side fallback filtering if API doesn't support it fully yet
    // But mostly rely on API reloading via load() when search/date changes?
    // For now, let's just return rows, assuming load() handles it.
    // Or we can do client-side filtering if the API returns all data.
    // Given the pattern in other pages, we should probably trigger load() on filter change.
    return rows
  }, [rows])

  // Trigger load on filter change (debounce could be added)
  useEffect(() => { load() }, [page, pageSize, startDate, endDate, search])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="mx-auto px-4 py-4">
          <DashboardHeader />
        </div>
      </header>

      <main className="flex-grow py-6">
        <div className="mb-4 px-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Expense</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="mx-4 mb-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
               <Button onClick={() => setOpenAdd(true)} className="bg-sky-500 hover:bg-sky-600">+ Add Expense</Button>
            </div>
            <div className="flex items-center gap-2">
               <div className="flex items-center gap-2 bg-white p-1 rounded border">
                  <DateInput 
                    value={startDate ? new Date(startDate) : undefined}
                    onChange={(d) => setStartDate(d ? d.toISOString().slice(0, 10) : "")}
                    placeholder="Start date"
                    className="border-none shadow-none w-32"
                  />
                  <span className="text-gray-400">→</span>
                  <DateInput 
                    value={endDate ? new Date(endDate) : undefined}
                    onChange={(d) => setEndDate(d ? d.toISOString().slice(0, 10) : "")}
                    placeholder="End date"
                    className="border-none shadow-none w-32"
                  />
               </div>
               <Input 
                 placeholder="Search Here..." 
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 className="w-64 bg-white"
               />
            </div>
        </div>

        <Card className="mx-4">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100 hover:bg-gray-100">
                  <TableHead className="w-16 font-semibold text-gray-900">SL.</TableHead>
                  <TableHead className="font-semibold text-gray-900">Date</TableHead>
                  <TableHead className="font-semibold text-gray-900">Voucher No.</TableHead>
                  <TableHead className="font-semibold text-gray-900">Account Name</TableHead>
                  <TableHead className="font-semibold text-gray-900 text-right">Total Amount</TableHead>
                  <TableHead className="font-semibold text-gray-900 text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r, idx) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-gray-600">{idx + 1}</TableCell>
                    <TableCell className="text-gray-600">{new Date(r.date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })}</TableCell>
                    <TableCell className="text-gray-600">{r.voucherNo}</TableCell>
                    <TableCell className="text-gray-600">{r.accountName}</TableCell>
                    <TableCell className="text-right text-gray-600">{r.totalAmount.toLocaleString()}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button variant="secondary" size="sm" className="bg-sky-500 hover:bg-sky-600 text-white h-7 px-3">View</Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="bg-sky-500 hover:bg-sky-600 text-white h-7 px-3"
                          onClick={() => { setEditingRow(r); setOpenEdit(true) }}
                          disabled={editingId === r.id}
                        >
                          {editingId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Edit"}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="bg-red-500 hover:bg-red-600 h-7 px-3"
                          onClick={() => setConfirmDeleteId(r.id)}
                          disabled={deletingId === r.id}
                        >
                          {deletingId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Delete"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">{loading ? "Loading..." : "No data found"}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      <ExpenseModal
        open={openAdd}
        mode="add"
        onOpenChange={setOpenAdd}
        onSubmit={async (payload: any) => {
          try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 500))
            const newRow: ExpenseRow = {
              id: Date.now().toString(),
              voucherNo: `EXP-00${rows.length + 3}`,
              ...payload
            }
            setRows([newRow, ...rows])
            return true
          } catch {
            return false
          }
        }}
      />

      <ExpenseModal
        open={openEdit}
        mode="edit"
        onOpenChange={(v) => { if (!v) setEditingRow(null); setOpenEdit(v) }}
        initialValues={editingRow ? {
          items: editingRow.items,
          paymentMethod: editingRow.paymentMethod,
          accountId: editingRow.accountId,
          totalAmount: editingRow.totalAmount,
          date: editingRow.date,
          note: editingRow.note
        } : undefined}
        onSubmit={async (payload) => {
          if (!editingRow) return false
          try {
            setEditingId(editingRow.id)
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 500))
            
            setRows(rows.map(r => r.id === editingRow.id ? { ...r, ...payload } : r))
            
            setEditingRow(null)
            setEditingId(null)
            setOpenEdit(false)
            return true
          } catch {
            setEditingId(null)
            return false
          }
        }}
      />

      <AlertDialog open={!!confirmDeleteId} onOpenChange={(v) => { if (!v) setConfirmDeleteId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={async () => {
                if (!confirmDeleteId) return
                setDeletingId(confirmDeleteId)
                try {
                  // Simulate API call
                  await new Promise(resolve => setTimeout(resolve, 500))
                  setRows(rows.filter(r => r.id !== confirmDeleteId))
                } catch {}
                setDeletingId(null)
                setConfirmDeleteId(null)
              }}
            >
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
