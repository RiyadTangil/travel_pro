"use client"

import { useEffect, useMemo, useState } from "react"
import { DashboardHeader } from "@/components/dashboard/header"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PassportToolbar } from "@/components/passports/passport-toolbar"
import { PassportTable, type Passport } from "@/components/passports/passport-table"
import { PassportModal } from "@/components/passports/passport-modal"

function daysRemaining(doe?: string) {
  if (!doe) return ""
  const diff = Math.ceil((new Date(doe).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  return diff > 0 ? `${diff} days` : `${diff} days`
}

export default function PassportPage() {
  const [passports, setPassports] = useState<Passport[]>([])
  const [q, setQ] = useState("")
  const [status, setStatus] = useState<string>("All")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [open, setOpen] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Passport | null>(null)

  // Fetch passports from API
  const fetchPassports = async () => {
    const qs = new URLSearchParams({ page: "1", limit: "50", search: q, status, startDate, endDate }).toString()
    const res = await fetch(`/api/passports?${qs}`)
    const data = await res.json()
    if (res.ok) {
      const rows: Passport[] = (data.passports || []).map((p: any) => ({
        id: p.id,
        createdDate: new Date(p.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
        passportNo: p.passportNo,
        name: p.name,
        mobile: p.mobile,
        dob: p.dob,
        doi: p.dateOfIssue,
        doe: p.dateOfExpire,
        remaining: daysRemaining(p.dateOfExpire),
        email: p.email,
        status: p.status || "PENDING",
        note: p.note,
      }))
      setPassports(rows)
    }
  }

  useEffect(() => { fetchPassports() }, [])
  useEffect(() => { fetchPassports() }, [q, status, startDate, endDate])

  const filtered = useMemo(() => {
    const term = q.toLowerCase()
    return passports.filter(p => {
      const matchesSearch = !term || [p.passportNo, p.name, p.mobile, p.email || ""].some(v => (v || "").toLowerCase().includes(term))
      const matchesStatus = status === "All" || p.status === status
      const created = p.createdDate
      const withinStart = !startDate || new Date(created).getTime() >= new Date(startDate).getTime()
      const withinEnd = !endDate || new Date(created).getTime() <= new Date(endDate).getTime()
      return matchesSearch && matchesStatus && withinStart && withinEnd
    })
  }, [passports, q, status, startDate, endDate])

  const handleAdd = async (payload: any) => {
    const res = await fetch('/api/passports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (res.ok) await fetchPassports()
  }

  const handleEdit = async (p: Passport) => {
    setEditing(p)
    setOpen(true)
  }

  const handleDelete = async (p: Passport) => {
    setLoadingId(p.id)
    const res = await fetch(`/api/passports/${p.id}`, { method: 'DELETE' })
    await fetchPassports()
    setLoadingId(null)
  }

  const handleChangeStatus = async (p: Passport) => {
    setLoadingId(p.id)
    const nextMap: Record<Passport["status"], Passport["status"]> = { PENDING: "APPROVED", APPROVED: "DELIVERED", DELIVERED: "PENDING" }
    await fetch(`/api/passports/${p.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: nextMap[p.status] }) })
    await fetchPassports()
    setLoadingId(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="mx-auto px-4 py-4">
          <DashboardHeader />
        </div>
      </header>

      <main className="flex-grow px-4 py-6">
        <div className="mb-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Passport</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Passport</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <PassportToolbar
              onAdd={() => setOpen(true)}
              onExcel={() => { /* reserved */ }}
              onSearch={(v) => setQ(v)}
              onRefresh={() => { setQ(""); setStatus("All"); setStartDate(""); setEndDate("") }}
              status={status}
              onStatusChange={setStatus}
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
            />

            <PassportTable
              data={filtered}
              loadingId={loadingId}
              onChangeStatus={handleChangeStatus}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </CardContent>
        </Card>

        <PassportModal
          open={open}
          onClose={() => { setOpen(false); setEditing(null) }}
          onSubmit={async (payload) => {
            if (editing) {
              setLoadingId(editing.id)
              await fetch(`/api/passports/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
              await fetchPassports()
              setLoadingId(null)
            } else {
              await handleAdd(payload)
            }
          }}
          mode={editing ? "edit" : "add"}
          initialValues={editing ? {
            clientId: '',
            passportNo: editing.passportNo,
            paxType: undefined,
            name: editing.name,
            mobile: editing.mobile,
            email: editing.email,
            dob: editing.dob,
            dateOfIssue: editing.doi,
            dateOfExpire: editing.doe,
            note: editing.note,
          } : undefined}
        />
      </main>
    </div>
  )
}