"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PassportToolbar } from "@/components/passports/passport-toolbar"
import { PassportTable, type Passport } from "@/components/passports/passport-table"
import { PassportModal } from "@/components/passports/passport-modal"
import { PageWrapper } from "@/components/shared/page-wrapper"
import FilterBar from "@/components/money-receipts/FilterBar"
import { DateRange } from "react-day-picker"
import { Loader2 } from "lucide-react"

function daysRemaining(doe?: string) {
  if (!doe) return ""
  const diff = Math.ceil((new Date(doe).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  return diff > 0 ? `${diff} days` : `${diff} days`
}

export default function PassportPage() {
  const [passports, setPassports] = useState<Passport[]>([])
  const [q, setQ] = useState("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [status, setStatus] = useState<string>("All")
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Passport | null>(null)

  // Fetch passports from API
  const fetchPassports = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = { page: "1", limit: "50", search: q, status }
      if (dateRange?.from) params.startDate = dateRange.from.toISOString().slice(0, 10)
      if (dateRange?.to) params.endDate = dateRange.to.toISOString().slice(0, 10)
      
      const qs = new URLSearchParams(params).toString()
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
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [q, status, dateRange])

  useEffect(() => { fetchPassports() }, [fetchPassports])

  const filtered = useMemo(() => {
    const term = q.toLowerCase()
    return passports.filter(p => {
      const matchesSearch = !term || [p.passportNo, p.name, p.mobile, p.email || ""].some(v => (v || "").toLowerCase().includes(term))
      const matchesStatus = status === "All" || p.status === status
      return matchesSearch && matchesStatus
    })
  }, [passports, q, status])

  const handleAdd = async (payload: any) => {
    const res = await fetch('/api/passports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (res.ok) await fetchPassports()
  }

  const handleEdit = async (p: Passport) => {
    setEditing(p)
    setOpen(true)
  }

  const handleDelete = async (p: Passport) => {
    if (!confirm("Are you sure?")) return
    setLoadingId(p.id)
    await fetch(`/api/passports/${p.id}`, { method: 'DELETE' })
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
    <PageWrapper breadcrumbs={[{ label: "Passport" }]}>
        <div className="space-y-6 px-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base font-semibold">Passports</CardTitle>
              <div className="flex items-center gap-4">
                <PassportToolbar onAdd={() => { setEditing(null); setOpen(true) }} />
                <FilterBar
                  dateRange={dateRange}
                  search={q}
                  onDateRangeChange={setDateRange}
                  onSearchChange={setQ}
                  onRefresh={fetchPassports}
                />
              </div>
            </CardHeader>
            <CardContent>
              {loading && passports.length === 0 ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
                </div>
              ) : (
                <PassportTable
                  passports={filtered}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onChangeStatus={handleChangeStatus}
                  loadingId={loadingId}
                />
              )}
            </CardContent>
          </Card>
        </div>

      <PassportModal
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onSubmit={async (payload) => {
          if (editing) {
            const res = await fetch(`/api/passports/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
            if (res.ok) await fetchPassports()
          } else {
            await handleAdd(payload)
          }
          setOpen(false)
        }}
      />
    </PageWrapper>
  )
}

     