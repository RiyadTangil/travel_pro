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
import { Loader2, Search, Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { PaginationWithLinks } from "@/components/ui/pagination-with-links"
import CompanyModal from "@/components/configuration/CompanyModal"
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

type CompanyRow = {
  id: string
  name: string
  contactPerson: string
  designation: string
  phone: string
  address: string
  createDate: string
}

export default function NonInvoiceCompaniesPage() {
  const { data: session } = useSession()
  const [rows, setRows] = useState<CompanyRow[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  
  const [openModal, setOpenModal] = useState(false)
  const [modalMode, setModalMode] = useState<"add" | "edit">("add")
  const [editingRow, setEditingRow] = useState<CompanyRow | null>(null)
  
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
      
      const res = await client.get(`/api/configuration/companies?${params.toString()}`)
      const data = res.data
      setRows(data.items || [])
      setTotal(data.pagination?.total || 0)
    } catch (e) {
      console.error(e)
    } finally { 
      setLoading(false) 
    }
  }

  useEffect(() => { load() }, [session, page, pageSize, search])

  const handleAdd = () => {
    setEditingRow(null)
    setModalMode("add")
    setOpenModal(true)
  }

  const handleEdit = (row: CompanyRow) => {
    setEditingRow(row)
    setModalMode("edit")
    setOpenModal(true)
  }

  const handleDelete = async () => {
    if (!confirmDeleteId) return
    setDeletingId(confirmDeleteId)
    try {
      await client.delete(`/api/configuration/companies/${confirmDeleteId}`)
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
        await client.post("/api/configuration/companies", values)
      } else {
        await client.put(`/api/configuration/companies/${editingRow?.id}`, values)
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
                <BreadcrumbLink>Configuration</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Companies</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="mx-4 mb-6 flex justify-between items-center">
           <h1 className="text-2xl font-semibold text-gray-800">Non-Invoice Companies</h1>
           <Button onClick={handleAdd} className="bg-sky-500 hover:bg-sky-600">
             <Plus className="w-4 h-4 mr-2" /> Add New Company
           </Button>
        </div>

        <Card className="mx-4 border-none shadow-none bg-transparent">
          <CardContent className="p-0">
            <div className="bg-white rounded-md border shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-100 hover:bg-gray-100 border-b">
                    <TableHead className="w-16 font-bold text-gray-900 bg-gray-200/50">SL.</TableHead>
                    <TableHead className="font-bold text-gray-900 bg-gray-200/50">Company Name</TableHead>
                    <TableHead className="font-bold text-gray-900 bg-gray-200/50">Address</TableHead>
                    <TableHead className="font-bold text-gray-900 bg-gray-200/50">Contact Person</TableHead>
                    <TableHead className="font-bold text-gray-900 bg-gray-200/50">Designation</TableHead>
                    <TableHead className="font-bold text-gray-900 bg-gray-200/50">Phone</TableHead>
                    <TableHead className="font-bold text-gray-900 bg-gray-200/50">Create Date</TableHead>
                    <TableHead className="font-bold text-gray-900 bg-gray-200/50 text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, idx) => (
                    <TableRow key={r.id} className="hover:bg-gray-50 border-b last:border-0">
                      <TableCell className="font-medium text-gray-600">{(page - 1) * pageSize + idx + 1}</TableCell>
                      <TableCell className="text-gray-800 font-medium">{r.name}</TableCell>
                      <TableCell className="text-gray-600 max-w-[200px] truncate" title={r.address}>{r.address}</TableCell>
                      <TableCell className="text-gray-600">{r.contactPerson}</TableCell>
                      <TableCell className="text-gray-600">{r.designation}</TableCell>
                      <TableCell className="text-gray-600">{r.phone}</TableCell>
                      <TableCell className="text-gray-600 whitespace-nowrap">
                        {new Date(r.createDate).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button 
                            size="sm" 
                            className="bg-sky-500 hover:bg-sky-600 text-white h-8 px-3"
                            onClick={() => handleEdit(r)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            className="bg-red-500 hover:bg-red-600 text-white h-8 px-3"
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
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : "No companies found"}
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

      <CompanyModal 
        open={openModal}
        onOpenChange={setOpenModal}
        mode={modalMode}
        initialValues={editingRow || undefined}
        onSubmit={handleModalSubmit}
      />

      <AlertDialog open={!!confirmDeleteId} onOpenChange={(v) => { if (!v) setConfirmDeleteId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Company</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this company? This action cannot be undone.
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
