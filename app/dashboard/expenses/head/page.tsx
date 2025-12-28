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
import ExpenseHeadModal from "@/components/expenses/ExpenseHeadModal"
import { RefreshCcw, Loader2 } from "lucide-react"
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

type ExpenseHeadRow = {
  id: string
  name: string
  createdAt: string
}

export default function ExpenseHeadPage() {
  const { data: session } = useSession()
  const [rows, setRows] = useState<ExpenseHeadRow[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [search, setSearch] = useState<string>("")
  const [openAdd, setOpenAdd] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [editingRow, setEditingRow] = useState<ExpenseHeadRow | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => !q || r.name.toLowerCase().includes(q))
  }, [rows, search])

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
      const res = await client.get(`/api/expense-heads?${params.toString()}`)
      const data = res.data
      const items: ExpenseHeadRow[] = Array.isArray(data?.items) ? data.items : (Array.isArray(data?.data?.items) ? data.data.items : [])
      const pag = data?.pagination || data?.data?.pagination || {}
      setRows(items)
      setTotal(Number(pag?.total || 0))
      setPage(Number(pag?.page || page))
      setPageSize(Number(pag?.pageSize || pageSize))
    } catch { } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleRefresh = () => { load() }

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
                <BreadcrumbPage>Expense Head</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <Card className="mx-2">
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Expense Head</CardTitle>
              <div className="flex items-center gap-2">
                <Button onClick={handleRefresh} variant="outline" title="Refresh" aria-label="Refresh">
                  <RefreshCcw className="h-4 w-4" />
                </Button>
                <Button onClick={() => setOpenAdd(true)} className="bg-sky-500 hover:bg-sky-600">+ Add New Head</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="w-12">SL.</TableHead>
                  <TableHead>Head Name</TableHead>
                  <TableHead>Create Date</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r, idx) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{idx + 1}</TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{new Date(r.createdAt).toLocaleDateString("en-GB")}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-sky-500 hover:bg-sky-600"
                          onClick={() => { setEditingRow(r); setOpenEdit(true) }}
                          disabled={editingId === r.id}
                        >
                          {editingId === r.id ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Editing...</span> : "Edit"}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setConfirmDeleteId(r.id)}
                          disabled={deletingId === r.id}
                        >
                          {deletingId === r.id ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Deleting...</span> : "Delete"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-gray-500">{loading ? "Loading..." : "No data"}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      <ExpenseHeadModal
        open={openAdd}
        mode="add"
        onOpenChange={setOpenAdd}
        onSubmit={async (payload: any) => {
          try {
            await client.post(`/api/expense-heads`, { name: payload.name })
            await load()
            return true
          } catch {
            return false
          }
        }}
      />

      <ExpenseHeadModal
        open={openEdit}
        mode="edit"
        onOpenChange={(v) => { if (!v) setEditingRow(null); setOpenEdit(v) }}
        initialValues={editingRow ? { name: editingRow.name } : undefined}
        onSubmit={async (payload) => {
          if (!editingRow) return false
          try {
            setEditingId(editingRow.id)
            await client.put(`/api/expense-heads/${editingRow.id}`, { name: payload.name })
            await load()
            setEditingRow(null)
            setEditingId(null)
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
            <AlertDialogTitle>Delete Expense Head</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense head? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!confirmDeleteId) return
                setDeletingId(confirmDeleteId)
                try {
                  await client.delete(`/api/expense-heads/${confirmDeleteId}`)
                } catch {}
                setDeletingId(null)
                setConfirmDeleteId(null)
                load()
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
