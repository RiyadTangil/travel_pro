"use client"

import { useMemo, useState, useEffect } from "react"
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
// import { FilterBar } from "@/components/money-receipts/FilterBar"
import AdvanceReturnModal from "@/components/money-receipts/AdvanceReturnModal"
import FilterBar from "@/components/money-receipts/FilterBar"

type AdvanceReturnRow = {
  id: string
  returnDate: string
  voucherNo: string
  clientName: string
  paymentType: string
  paymentDetails: string
  advanceAmount: number
  returnNote?: string
}

export default function AdvanceReturnPage() {
  const { data: session } = useSession()
  const [rows, setRows] = useState<AdvanceReturnRow[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [search, setSearch] = useState<string>("")

  const [openAdd, setOpenAdd] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [editingRow, setEditingRow] = useState<AdvanceReturnRow | null>(null)

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const dOk = (() => {
        if (startDate && r.returnDate < startDate) return false
        if (endDate && r.returnDate > endDate) return false
        return true
      })()
      const q = search.trim().toLowerCase()
      const sOk = !q || [r.voucherNo, r.clientName, r.paymentType, r.paymentDetails].some((v) => v.toLowerCase().includes(q))
      return dOk && sOk
    })
  }, [rows, startDate, endDate, search])

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("pageSize", String(pageSize))
      if (search) params.set("search", search)
      if (startDate) params.set("dateFrom", startDate)
      if (endDate) params.set("dateTo", endDate)
      const res = await fetch(`/api/advance-returns?${params.toString()}`, { headers: { "x-company-id": session?.user?.companyId ?? "" } })
      const data = await res.json()
      const items: AdvanceReturnRow[] = Array.isArray(data?.items) ? data.items : (Array.isArray(data?.data?.items) ? data.data.items : [])
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
                <BreadcrumbPage>List of Advance Return</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <Card className="mx-2">
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Advance Return</CardTitle>
              <FilterBar
                startDate={startDate}
                endDate={endDate}
                search={search}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
                onSearchChange={setSearch}
                onRefresh={handleRefresh}
              />
            </div>
            <div>
              <Button onClick={() => setOpenAdd(true)} className="bg-sky-500 hover:bg-sky-600">+ Add Advance Return</Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="w-12">SL.</TableHead>
                  <TableHead>Return Date</TableHead>
                  <TableHead>Voucher No</TableHead>
                  <TableHead>Client Name</TableHead>
                  <TableHead>Payment Type</TableHead>
                  <TableHead>Payment Details</TableHead>
                  <TableHead className="text-right">Advance Amount</TableHead>
                  <TableHead>Return Note</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r, idx) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{idx + 1}</TableCell>
                    <TableCell>{new Date(r.returnDate).toLocaleDateString("en-GB")}</TableCell>
                    <TableCell className="font-medium">{r.voucherNo}</TableCell>
                    <TableCell>{r.clientName}</TableCell>
                    <TableCell>{r.paymentType}</TableCell>
                    <TableCell>{r.paymentDetails}</TableCell>
                    <TableCell className="text-right">{r.advanceAmount.toLocaleString()}</TableCell>
                    <TableCell>{r.returnNote || ""}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="secondary" size="sm">View</Button>
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
                          onClick={async () => {
                            setDeletingId(r.id)
                            try {
                              const res = await fetch(`/api/advance-returns/${r.id}`, { method: "DELETE", headers: { "x-company-id": session?.user?.companyId ?? "" } })
                              await res.json()
                            } catch {}
                            setDeletingId(null)
                            load()
                          }}
                        >
                          {deletingId === r.id ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-6 text-gray-500">No data</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      <AdvanceReturnModal
        open={openAdd}
        mode="add"
        onOpenChange={setOpenAdd}
        onSubmit={async (payload: any) => {
          try {
            const body = {
              clientId: payload.clientId,
              paymentMethod: payload.paymentMethod,
              accountId: payload.accountId,
              accountName: payload.accountName,
              advanceAmount: Number(payload.advanceAmount || 0),
              returnDate: payload.returnDate,
              returnNote: payload.returnNote || "",
              receiptNo: payload.receiptNo || "",
              transactionCharge: Number(payload.transactionCharge || 0),
            }
            const res = await fetch(`/api/advance-returns`, { method: "POST", headers: { "Content-Type": "application/json", "x-company-id": session?.user?.companyId ?? "" }, body: JSON.stringify(body) })
            await res.json()
            load()
            return res.ok
          } catch {
            return false
          }
        }}
      />

      <AdvanceReturnModal
        open={openEdit}
        mode="edit"
        onOpenChange={(v) => { if (!v) setEditingRow(null); setOpenEdit(v) }}
        initialValues={editingRow ? {
          clientName: editingRow.clientName,
          paymentMethod: editingRow.paymentType,
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
            const body: any = {
              paymentMethod: payload.paymentMethod,
              accountName: payload.accountName,
              advanceAmount: Number(payload.advanceAmount || 0),
              returnDate: payload.returnDate,
              returnNote: payload.returnNote || "",
              receiptNo: payload.receiptNo || "",
              transactionCharge: Number(payload.transactionCharge || 0),
            }
            const res = await fetch(`/api/advance-returns/${editingRow.id}`, { method: "PUT", headers: { "Content-Type": "application/json", "x-company-id": session?.user?.companyId ?? "" }, body: JSON.stringify(body) })
            await res.json()
            load()
            return res.ok
          } catch {
            return false
          }
        }}
      />
    </div>
  )
}
