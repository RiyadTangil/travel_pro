"use client"

import { useMemo, useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { PageWrapper } from "@/components/shared/page-wrapper"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import FilterBar from "@/components/money-receipts/FilterBar"
import VendorAdvanceReturnModal from "@/components/vendors/vendor-advance-return-modal"
import { format } from "date-fns"
import { Loader2, Plus } from "lucide-react"
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

type VendorAdvanceReturnRow = {
  id: string
  returnDate: string
  voucherNo: string
  vendorName: string
  vendorId: string
  paymentType: string
  paymentDetails: string
  accountId: string
  advanceAmount: number
  returnNote?: string
}

export default function VendorAdvanceReturnPage() {
  const { data: session } = useSession()
  const [rows, setRows] = useState<VendorAdvanceReturnRow[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [search, setSearch] = useState<string>("")

  const [openAdd, setOpenAdd] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [editingRow, setEditingRow] = useState<VendorAdvanceReturnRow | null>(null)

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const dOk = (() => {
        if (dateRange?.from && new Date(r.returnDate) < dateRange.from) return false
        if (dateRange?.to && new Date(r.returnDate) > dateRange.to) return false
        return true
      })()
      const q = search.trim().toLowerCase()
      const sOk = !q || [r.voucherNo, r.vendorName, r.paymentType, r.paymentDetails, r.returnNote || ""].some((v) => v.toLowerCase().includes(q))
      return dOk && sOk
    })
  }, [rows, dateRange, search])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("pageSize", String(pageSize))
      if (search) params.set("search", search)
      if (dateRange?.from) params.set("dateFrom", dateRange.from.toISOString().slice(0, 10))
      if (dateRange?.to) params.set("dateTo", dateRange.to.toISOString().slice(0, 10))
      const res = await fetch(`/api/vendors/advance-return?${params.toString()}`, { headers: { "x-company-id": session?.user?.companyId ?? "" } })
      const data = await res.json()
      const items: VendorAdvanceReturnRow[] = Array.isArray(data?.items) ? data.items : []
      const pag = data?.pagination || {}
      setRows(items)
      setTotal(Number(pag?.total || 0))
      setPage(Number(pag?.page || page))
      setPageSize(Number(pag?.pageSize || pageSize))
    } catch { } finally { setLoading(false) }
  }, [session?.user?.companyId, page, pageSize, search, dateRange])

  useEffect(() => { load() }, [load])

  const handleRefresh = () => { load() }

  const handleDelete = async () => {
    if (!confirmDeleteId) return
    setDeletingId(confirmDeleteId)
    setConfirmDeleteId(null)
    try {
      const res = await fetch(`/api/vendors/advance-return/${confirmDeleteId}`, { method: "DELETE", headers: { "x-company-id": session?.user?.companyId ?? "" } })
      await res.json()
      load()
    } catch {}
    setDeletingId(null)
  }

  return (
    <PageWrapper breadcrumbs={[{ label: "Advance Return" }]}>
        <Card className="mx-2">
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Advance Return</CardTitle>
              <FilterBar
                dateRange={dateRange}
                search={search}
                onDateRangeChange={setDateRange}
                onSearchChange={setSearch}
                onRefresh={handleRefresh}
              />
            </div>
            <div>
              <Button onClick={() => setOpenAdd(true)} className="bg-sky-500 hover:bg-sky-600">
                <Plus className="h-4 w-4 mr-2" />
                Add Advance Return
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="w-12">SL.</TableHead>
                  <TableHead>Return Date</TableHead>
                  <TableHead>Voucher No</TableHead>
                  <TableHead>Vendor Name</TableHead>
                  <TableHead className="text-right">Advance Amount</TableHead>
                  <TableHead>Return Note</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && rows.length === 0 ? (
                   <TableRow>
                     <TableCell colSpan={7} className="text-center py-6 text-gray-500">Loading...</TableCell>
                   </TableRow>
                ) : filtered.map((r, idx) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{idx + 1}</TableCell>
                    <TableCell>{r.returnDate ? format(new Date(r.returnDate), "dd-MM-yyyy") : "-"}</TableCell>
                    <TableCell className="font-medium">{r.voucherNo}</TableCell>
                    <TableCell className="text-blue-500 font-medium">{r.vendorName}</TableCell>
                    <TableCell className="text-right font-semibold">{r.advanceAmount.toLocaleString()}</TableCell>
                    <TableCell>{r.returnNote || ""}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="secondary" size="sm" className="bg-sky-500 hover:bg-sky-600 text-white hover:text-white">View</Button>
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-sky-500 hover:bg-sky-600"
                          onClick={() => { setEditingRow(r); setOpenEdit(true) }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setConfirmDeleteId(r.id)}
                          disabled={deletingId === r.id}
                        >
                          {deletingId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Delete"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-gray-500">No data</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      <VendorAdvanceReturnModal
        open={openAdd}
        mode="add"
        onOpenChange={setOpenAdd}
        onSubmit={async (payload) => {
          try {
            const body = {
              vendorId: payload.vendorId,
              paymentMethod: payload.paymentMethod,
              accountId: payload.accountId,
              accountName: payload.accountName,
              advanceAmount: Number(payload.advanceAmount || 0),
              amount: Number(payload.advanceAmount || 0),
              returnDate: payload.returnDate,
              note: payload.returnNote || "",
            }
            const res = await fetch(`/api/vendors/advance-return`, { method: "POST", headers: { "Content-Type": "application/json", "x-company-id": session?.user?.companyId ?? "" }, body: JSON.stringify(body) })
            await res.json()
            load()
          } catch {
          }
        }}
      />

      <VendorAdvanceReturnModal
        open={openEdit}
        mode="edit"
        onOpenChange={(v) => { if (!v) setEditingRow(null); setOpenEdit(v) }}
        initialValues={editingRow ? {
          vendorId: editingRow.vendorId,
          vendorName: editingRow.vendorName,
          paymentMethod: editingRow.paymentType,
          accountId: editingRow.accountId,
          accountName: editingRow.paymentDetails,
          advanceAmount: String(editingRow.advanceAmount),
          returnDate: editingRow.returnDate,
          returnNote: editingRow.returnNote || "",
          presentBalance: "0",
          availableBalance: "",
        } : undefined}
        onSubmit={async (payload) => {
          if (!editingRow) return
          try {
            const body = {
              paymentMethod: payload.paymentMethod,
              accountId: payload.accountId,
              accountName: payload.accountName,
              advanceAmount: Number(payload.advanceAmount || 0),
              amount: Number(payload.advanceAmount || 0),
              returnDate: payload.returnDate,
              note: payload.returnNote || "",
            }
            const res = await fetch(`/api/vendors/advance-return/${editingRow.id}`, { method: "PUT", headers: { "Content-Type": "application/json", "x-company-id": session?.user?.companyId ?? "" }, body: JSON.stringify(body) })
            await res.json()
            load()
          } catch {
          }
        }}
      />
      
      <AlertDialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  )
}
