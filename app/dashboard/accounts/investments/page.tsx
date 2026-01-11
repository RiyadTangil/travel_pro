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
import { Loader2, Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { PaginationWithLinks } from "@/components/ui/pagination-with-links"
import InvestmentModal from "@/components/accounts/InvestmentModal"
import { DateRangePickerWithPresets } from "@/components/ui/date-range-with-presets"
import { DateRange } from "react-day-picker"
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

type InvestmentRow = {
  id: string
  date: string
  voucherNo: string
  companyName: string
  companyId: string
  accountId: string
  accountName: string
  paymentMethod: string
  amount: number
  note: string
}

export default function InvestmentsPage() {
  const { data: session } = useSession()
  const [rows, setRows] = useState<InvestmentRow[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>()

  const [openModal, setOpenModal] = useState(false)
  const [modalMode, setModalMode] = useState<"add" | "edit">("add")
  const [editingRow, setEditingRow] = useState<InvestmentRow | null>(null)

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

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
      if (dateRange?.from) params.set("dateFrom", dateRange.from.toISOString().slice(0, 10))
      if (dateRange?.to) params.set("dateTo", dateRange.to.toISOString().slice(0, 10))

      const res = await client.get(`/api/investments?${params.toString()}`)
      const data = res.data
      setRows(data.items || [])
      setTotal(data.pagination?.total || 0)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [session, page, pageSize, search, dateRange])

  const handleAdd = () => {
    setEditingRow(null)
    setModalMode("add")
    setOpenModal(true)
  }

  const handleEdit = (row: InvestmentRow) => {
    setEditingRow(row)
    setModalMode("edit")
    setOpenModal(true)
  }

  const handleDelete = async () => {
    if (!confirmDeleteId) return
    setDeletingId(confirmDeleteId)
    try {
      await client.delete(`/api/investments/${confirmDeleteId}`)
      await load()
    } catch (e) {
      console.error(e)
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  const handleModalSubmit = async (values: any) => {
    try {
      if (modalMode === "add") {
        await client.post("/api/investments", values)
      } else {
        await client.put(`/api/investments/${editingRow?.id}`, values)
      }
      await load()
      return true
    } catch (e) {
      console.error(e)
      return false
    }
  }

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
                <BreadcrumbLink href="/dashboard/accounts">Accounts</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Investments</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="mx-4 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
           <Button onClick={handleAdd} className="bg-sky-500 hover:bg-sky-600">
             <Plus className="w-4 h-4 mr-2" /> Add Investment
           </Button>

           <div className="flex items-center gap-2">
               <DateRangePickerWithPresets 
                 date={dateRange}
                 onDateChange={setDateRange}
                 className="bg-white"
               />
               <Input 
                 placeholder="Search Here..." 
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 className="w-64 bg-white"
               />
           </div>
        </div>

        <Card className="mx-4 border-none shadow-none bg-transparent">
          <CardContent className="p-0">
            <div className="bg-white rounded-md border shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-100 hover:bg-gray-100 border-b">
                    <TableHead className="w-12 font-bold text-gray-900 bg-gray-200/50">SL.</TableHead>
                    <TableHead className="font-bold text-gray-900 bg-gray-200/50">Date</TableHead>
                    <TableHead className="font-bold text-gray-900 bg-gray-200/50">Voucher No</TableHead>
                    <TableHead className="font-bold text-gray-900 bg-gray-200/50">Transaction Type</TableHead>
                    <TableHead className="font-bold text-gray-900 bg-gray-200/50">Transaction Details</TableHead>
                    <TableHead className="font-bold text-gray-900 bg-gray-200/50">Company</TableHead>
                    <TableHead className="font-bold text-gray-900 bg-gray-200/50">Amount</TableHead>
                    <TableHead className="font-bold text-gray-900 bg-gray-200/50">Note</TableHead>
                    <TableHead className="font-bold text-gray-900 bg-gray-200/50 text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, idx) => (
                    <TableRow key={r.id} className="hover:bg-gray-50 border-b last:border-0">
                      <TableCell className="font-medium text-gray-600">{(page - 1) * pageSize + idx + 1}</TableCell>
                      <TableCell className="text-gray-600 whitespace-nowrap">
                        {new Date(r.date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell className="text-gray-600">{r.voucherNo}</TableCell>
                      <TableCell className="text-gray-600">Investment</TableCell>
                      <TableCell className="text-gray-600">{r.accountName}</TableCell>
                      <TableCell className="text-gray-600">{r.companyName}</TableCell>
                      <TableCell className="text-gray-800 font-medium">{r.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-gray-600 max-w-[150px] truncate" title={r.note}>{r.note}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button size="sm" className="bg-sky-500 hover:bg-sky-600 text-white h-7 px-2">View</Button>
                          <Button 
                            size="sm" 
                            className="bg-sky-500 hover:bg-sky-600 text-white h-7 px-2"
                            onClick={() => handleEdit(r)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            className="bg-red-500 hover:bg-red-600 text-white h-7 px-2"
                            onClick={() => setConfirmDeleteId(r.id)}
                            disabled={deletingId === r.id}
                          >
                            {deletingId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Delete"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                        {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : "No records found"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <PaginationWithLinks 
              totalCount={total}
              pageSize={pageSize}
              page={page}
              setPage={setPage}
            />
          </CardContent>
        </Card>
      </main>

      <InvestmentModal 
        open={openModal}
        onOpenChange={setOpenModal}
        mode={modalMode}
        initialValues={editingRow ? {
            companyId: editingRow.companyId,
            paymentMethod: editingRow.paymentMethod,
            accountId: editingRow.accountId,
            amount: String(editingRow.amount),
            date: editingRow.date,
            note: editingRow.note,
            companyName: editingRow.companyName,
            accountName: editingRow.accountName
        } : undefined}
        onSubmit={handleModalSubmit}
      />

      <AlertDialog open={!!confirmDeleteId} onOpenChange={(v) => { if (!v) setConfirmDeleteId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={handleDelete}
            >
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
