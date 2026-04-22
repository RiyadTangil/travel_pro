"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { PageWrapper } from "@/components/shared/page-wrapper"
import FilterToolbar from "@/components/shared/filter-toolbar"
import { PassportTable, type Passport } from "@/components/passports/passport-table"
import { PassportModal, type PassportPayload } from "@/components/passports/passport-modal"
import { ClearableSelect, type Option } from "@/components/shared/clearable-select"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { DateRange } from "react-day-picker"
import { Plus } from "lucide-react"
import { toast } from "sonner"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysRemaining(doe?: string): string {
  if (!doe) return ""
  const diff = Math.ceil((new Date(doe).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  return `${diff} days`
}

function mapApiToPassport(p: any): Passport {
  return {
    id: String(p.id || p._id),
    createdDate: p.createdAt
      ? new Date(p.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
      : "—",
    passportNo: p.passportNo || "",
    paxType: p.paxType || "",
    name: p.name || "",
    mobile: p.mobile || "",
    email: p.email || "",
    nid: p.nid || "",
    clientId: p.clientId || "",
    dob: p.dob || "",
    doi: p.dateOfIssue || "",
    doe: p.dateOfExpire || "",
    remaining: daysRemaining(p.dateOfExpire),
    note: p.note || "",
    status: (p.status as Passport["status"]) || "PENDING",
    scanCopyUrl: p.scanCopyUrl || "",
    othersDocUrl: p.othersDocUrl || "",
    imageUrl: p.imageUrl || "",
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = ["All", "PENDING", "APPROVED", "DELIVERED"]
const DEFAULT_PAGE_SIZE = 20

export default function PassportPage() {
  const { data: session } = useSession()
  const companyId = session?.user?.companyId ?? ""

  const [passports, setPassports] = useState<Passport[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  // Filters
  const [search, setSearch] = useState("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [status, setStatus] = useState("All")
  const [clientId, setClientId] = useState("")

  // Client options for the filter dropdown
  const [clientOptions, setClientOptions] = useState<Option[]>([])

  // Modal
  const [openModal, setOpenModal] = useState(false)
  const [editing, setEditing] = useState<Passport | null>(null)

  // ---------------------------------------------------------------------------
  // Load client list for filter dropdown
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!companyId) return
      ; (async () => {
        try {
          const res = await fetch(`/api/clients-manager?page=1&limit=200`, {
            headers: { "x-company-id": companyId },
          })
          const data = await res.json()
          const options: Option[] = (data.clients || []).map((c: any) => ({
            value: String(c.id),
            label: c.name || c.id,
          }))
          setClientOptions(options)
        } catch { /* non-critical */ }
      })()
  }, [companyId])

  // ---------------------------------------------------------------------------
  // Fetch passports
  // ---------------------------------------------------------------------------
  const fetchPassports = useCallback(async (pg = page, ps = pageSize) => {
    setLoading(true)
    try {
      const params: Record<string, string> = {
        page: String(pg),
        limit: String(ps),
        search,
      }
      if (status !== "All") params.status = status
      if (clientId) params.clientId = clientId
      if (dateRange?.from) params.startDate = dateRange.from.toISOString().slice(0, 10)
      if (dateRange?.to) params.endDate = dateRange.to.toISOString().slice(0, 10)

      const res = await fetch(`/api/passports?${new URLSearchParams(params)}`, {
        headers: companyId ? { "x-company-id": companyId } : {},
      })
      const data = await res.json()
      if (res.ok) {
        setPassports((data.passports || []).map(mapApiToPassport))
        setTotal(data.pagination?.total ?? 0)
      } else {
        toast.error(data?.error || "Failed to load passports")
      }
    } catch {
      toast.error("Failed to load passports")
    } finally {
      setLoading(false)
    }
  }, [search, status, clientId, dateRange, companyId, page, pageSize])

  useEffect(() => {
    fetchPassports()
  }, [fetchPassports])

  const handlePageChange = (p: number, ps: number) => {
    setPage(p)
    setPageSize(ps)
    fetchPassports(p, ps)
  }

  // ---------------------------------------------------------------------------
  // Modal submit — handles both single (edit) and array (multi-add)
  // ---------------------------------------------------------------------------
  const handleModalSubmit = async (payload: PassportPayload | PassportPayload[]) => {
    const isEdit = !!editing
    try {
      if (isEdit) {
        const res = await fetch(`/api/passports/${editing!.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...(companyId ? { "x-company-id": companyId } : {}) },
          body: JSON.stringify(payload),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json?.error || "Failed to update passport")
        toast.success("Passport updated")
      } else {
        // POST accepts an array
        const items = Array.isArray(payload) ? payload : [payload]
        const res = await fetch("/api/passports", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(companyId ? { "x-company-id": companyId } : {}) },
          body: JSON.stringify(items),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json?.error || "Failed to create passport")
        toast.success(items.length > 1 ? `${items.length} passports created` : "Passport created")
      }
      setOpenModal(false)
      setEditing(null)
      setPage(1)
      await fetchPassports(1, pageSize)
    } catch (e: any) {
      toast.error(e?.message || "Something went wrong")
      throw e
    }
  }

  // ---------------------------------------------------------------------------
  // Row actions
  // ---------------------------------------------------------------------------
  const handleEdit = (p: Passport) => {
    setEditing(p)
    setOpenModal(true)
  }

  const handleDelete = async (p: Passport) => {
    if (!confirm(`Delete passport "${p.passportNo}"? This cannot be undone.`)) return
    setLoadingId(p.id)
    try {
      const res = await fetch(`/api/passports/${p.id}`, {
        method: "DELETE",
        headers: companyId ? { "x-company-id": companyId } : {},
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        toast.error(json?.error || "Failed to delete")
        return
      }
      toast.success("Passport deleted")
      setPassports((prev) => prev.filter((x) => x.id !== p.id))
      setTotal((t) => Math.max(0, t - 1))
    } catch {
      toast.error("Failed to delete passport")
    } finally {
      setLoadingId(null)
    }
  }

  const handleChangeStatus = async (p: Passport) => {
    const nextMap: Record<Passport["status"], Passport["status"]> = {
      PENDING: "APPROVED", APPROVED: "DELIVERED", DELIVERED: "PENDING",
    }
    setLoadingId(p.id)
    try {
      const res = await fetch(`/api/passports/${p.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(companyId ? { "x-company-id": companyId } : {}) },
        body: JSON.stringify({ status: nextMap[p.status] }),
      })
      if (!res.ok) { toast.error("Failed to update status"); return }
      toast.success("Status updated")
      await fetchPassports()
    } catch {
      toast.error("Failed to update status")
    } finally {
      setLoadingId(null)
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <PageWrapper breadcrumbs={[{ label: "Passport" }]}>
      <div className="mx-4 mb-4 min-w-0 max-w-full space-y-4">
        <FilterToolbar
          showSearch
          search={search}
          onSearchChange={(v) => { setSearch(v); setPage(1) }}
          searchPlaceholder="Search passport no, name, mobile..."
          showDateRange
          dateRange={dateRange}
          onDateRangeChange={(r) => { setDateRange(r); setPage(1) }}
          showRefresh
          onRefresh={() => fetchPassports(1, pageSize)}
          // Client select: right side, BEFORE date range
          filterExtrasBefore={
            <div className="flex items-center gap-2">
              <ClearableSelect
                options={clientOptions}
                value={clientId}
                onChange={(v) => { setClientId(v); setPage(1) }}
                placeholder="Filter by Client"
                className="w-52"
              />
              <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }

        >
          {/* Left side: action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => { setEditing(null); setOpenModal(true) }}
            >
              <Plus className="h-4 w-4 mr-1" /> Add Passport
            </Button>
            <Button variant="secondary" onClick={() => toast.info("Excel export coming soon")}>
              Excel Report
            </Button>
          </div>
        </FilterToolbar>

        <Card className="border-none shadow-none bg-transparent">
          <CardContent className="p-0">
            <div className="min-w-0 max-w-full bg-white rounded-md border shadow-sm overflow-hidden">
              <PassportTable
                data={passports}
                loading={loading}
                loadingId={loadingId}
                total={total}
                page={page}

                pageSize={pageSize}
                onPageChange={handlePageChange}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onChangeStatus={handleChangeStatus}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <PassportModal
        open={openModal}
        onClose={() => { setOpenModal(false); setEditing(null) }}
        mode={editing ? "edit" : "add"}
        initialValues={
          editing
            ? {
              clientId: editing.clientId || "",
              passportNo: editing.passportNo,
              paxType: editing.paxType,
              name: editing.name,
              mobile: editing.mobile,
              email: editing.email,
              nid: editing.nid,
              dob: editing.dob,
              dateOfIssue: editing.doi,
              dateOfExpire: editing.doe,
              note: editing.note,
            }
            : undefined
        }
        onSubmit={handleModalSubmit}
      />
    </PageWrapper>
  )
}
