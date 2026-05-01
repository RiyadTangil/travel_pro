"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { VendorTable } from "@/components/vendors/vendor-table"
import { VendorAddModal } from "@/components/vendors/vendor-add-modal"
import { VendorViewModal } from "@/components/vendors/vendor-view-modal"
import PaymentModal from "@/components/vendors/payment-modal"
import type { Vendor } from "@/components/vendors/types"
import { PageWrapper } from "@/components/shared/page-wrapper"
import FilterToolbar from "@/components/shared/filter-toolbar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { useInvoiceLookups } from "@/hooks/useInvoiceLookups"

export default function VendorsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [openAdd, setOpenAdd] = useState(false)
  const [editVendor, setEditVendor] = useState<Vendor | undefined>(undefined)
  const [viewVendor, setViewVendor] = useState<Vendor | undefined>(undefined)
  const [categories, setCategories] = useState<string[]>([])
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | undefined>(undefined)
  const [tableLoading, setTableLoading] = useState(false)
  const [statusBusyIds, setStatusBusyIds] = useState<string[]>([])

  const companyId = session?.user?.companyId ?? ""

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, 250)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await fetch(`/api/clients/client-categories?page=1&pageSize=100`, {
          headers: { "x-company-id": companyId },
        })
        const data = await res.json()
        const names = (data?.data || []).map((c: { name?: string }) => c.name).filter(Boolean)
        setCategories(names as string[])
      } catch (e) {
        console.error("Failed to load categories", e)
      }
    }
    loadCategories()
  }, [companyId])

  const loadVendors = useCallback(async () => {
    setTableLoading(true)
    try {
      const qs = new URLSearchParams({ page: "1", pageSize: "200", search: debouncedSearch }).toString()
      const res = await fetch(`/api/vendors?${qs}`, {
        headers: { "x-company-id": companyId },
      })
      const data = await res.json()
      setVendors(data?.data || [])
    } catch (e) {
      if (process.env.NODE_ENV !== "production") console.error("Failed to load vendors", e)
      toast.error("Failed to load vendors")
    } finally {
      setTableLoading(false)
    }
  }, [companyId, debouncedSearch])

  useEffect(() => {
    loadVendors()
  }, [loadVendors])

  const handleSubmit = async (v: Vendor) => {
    try {
      const payload = { ...v, companyId: companyId || null }
      const headers: HeadersInit = { "Content-Type": "application/json", "x-company-id": companyId }
      const url = editVendor?.id ? `/api/vendors/${editVendor.id}` : `/api/vendors`
      const method = editVendor?.id ? "PUT" : "POST"
      const res = await fetch(url, { method, headers, body: JSON.stringify(payload) })
      const errBody = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(errBody?.message || (typeof errBody?.error === "string" ? errBody.error : "Failed to save vendor"))
        return
      }
      toast.success(editVendor?.id ? "Vendor updated" : "Vendor created")
      setEditVendor(undefined)
      setOpenAdd(false)
      await loadVendors()
    } catch {
      toast.error("Failed to save vendor")
    }
  }

  const performDelete = async (v: Vendor) => {
    setDeleteLoadingId(v.id)
    try {
      const res = await fetch(`/api/vendors/${v.id}`, {
        method: "DELETE",
        headers: { "x-company-id": companyId },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(typeof data?.error === "string" ? data.error : "Failed to delete vendor")
        return
      }
      toast.success("Vendor deleted")
      setVendors((prev) => prev.filter((x) => x.id !== v.id))
    } finally {
      setDeleteLoadingId(undefined)
    }
  }

  const handleDelete = (v: Vendor) => {
    if (v.presentBalance.amount !== 0) {
      toast.error("This vendor has a non-zero balance. Settle it before deleting.")
      return
    }
    return performDelete(v)
  }

  const handleToggleStatus = async (v: Vendor, active: boolean) => {
    if (!!v.active === active) return
    try {
      setStatusBusyIds((prev) => [...prev, v.id])
      const res = await fetch(`/api/vendors/${v.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-company-id": companyId },
        body: JSON.stringify({ active }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || (typeof data?.error === "string" ? data.error : "Failed to update status"))
      setVendors((prev) => prev.map((x) => (x.id === v.id ? { ...x, active } : x)))
      toast.success(`Vendor is now ${active ? "Active" : "Inactive"}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update status")
    } finally {
      setStatusBusyIds((prev) => prev.filter((x) => x !== v.id))
    }
  }

  return (
    <PageWrapper breadcrumbs={[{ label: "Vendors" }]}>
      <div className="min-w-0 space-y-4 px-2 sm:px-4">
        <FilterToolbar
          showSearch
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by vendor name, mobile, email..."
          showRefresh
          onRefresh={loadVendors}
        >
          <Button
            className="bg-sky-500 hover:bg-sky-600 shrink-0"
            onClick={() => {
              setEditVendor(undefined)
              setOpenAdd(true)
            }}
          >
            <Plus className="h-4 w-4 mr-2" /> Add Vendor
          </Button>
        </FilterToolbar>

        <div className="bg-white rounded-md border shadow-sm overflow-hidden">
          <VendorTable
            vendors={vendors}
            loading={tableLoading}
            onView={(v) => setViewVendor(v)}
            onEdit={(v) => {
              setEditVendor(v)
              setOpenAdd(true)
            }}
            onAddPayment={() => router.push("/dashboard/vendors/payment")}
            onDelete={handleDelete}
            onToggleStatus={handleToggleStatus}
            statusBusyIds={statusBusyIds}
            deleteLoadingId={deleteLoadingId}
          />
        </div>
      </div>

      <VendorAddModal
        open={openAdd}
        onOpenChange={(open) => {
          setOpenAdd(open)
          if (!open) setEditVendor(undefined)
        }}
        initialData={editVendor}
        onSubmit={handleSubmit}
        productOptions={categories}
      />
      <VendorViewModal open={!!viewVendor} onOpenChange={() => setViewVendor(undefined)} vendor={viewVendor} />
    </PageWrapper>
  )
}
