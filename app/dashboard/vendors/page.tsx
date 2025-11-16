"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { VendorToolbar } from "@/components/vendors/vendor-toolbar"
import { VendorTable } from "@/components/vendors/vendor-table"
import { VendorAddModal } from "@/components/vendors/vendor-add-modal"
import { VendorViewModal } from "@/components/vendors/vendor-view-modal"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import type { Vendor } from "@/components/vendors/types"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

const initialVendors: Vendor[] = [
  { id: "1", name: "Sharif Bhai", mobilePrefix: "", mobile: "966-566180990", email: "test@email.com", presentBalance: { type: "due", amount: 1290000 }, fixedBalance: 0, active: true, products: [], createdBy: "Admin" ,creditLimit: 1000000},
  { id: "2", name: "Anower Hossain", mobilePrefix: "", mobile: "88-01828804585", email: "", presentBalance: { type: "due", amount: 200 }, fixedBalance: 0, active: true, products: [], createdBy: "Admin" },
  { id: "3", name: "Omor Faruk FAS", mobilePrefix: "", mobile: "88-01627613370", email: "", presentBalance: { type: "due", amount: 22000 }, fixedBalance: 0, active: true, products: [], createdBy: "Admin" },
  { id: "4", name: "Abu Hena Bhai", mobilePrefix: "", mobile: "88-01819676758", email: "", presentBalance: { type: "due", amount: 0 }, fixedBalance: 0, active: true, products: [], createdBy: "Admin" },
]

export default function VendorsPage() {
  const { data: session } = useSession()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [search, setSearch] = useState("")
  const [openAdd, setOpenAdd] = useState(false)
  const [editVendor, setEditVendor] = useState<Vendor | undefined>(undefined)
  const [viewVendor, setViewVendor] = useState<Vendor | undefined>(undefined)
  const [categories, setCategories] = useState<string[]>([])
  const [loadingId, setLoadingId] = useState<string | undefined>(undefined)
  const [loadingAction, setLoadingAction] = useState<"delete" | "toggleStatus" | undefined>(undefined)
  const [tableLoading, setTableLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTitle, setConfirmTitle] = useState("")
  const [confirmDescription, setConfirmDescription] = useState("")
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | undefined>(undefined)

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await fetch(`/api/clients/client-categories?page=1&pageSize=100`, {
          headers: { "x-company-id": session?.user?.companyId ?? "" },
        })
        const data = await res.json()
        const names = (data?.data || []).map((c: any) => c.name).filter(Boolean)
        setCategories(names)
      } catch (e) {
        console.error("Failed to load categories", e)
      }
    }
    loadCategories()
  }, [session?.user?.companyId])

  useEffect(() => {
    const controller = new AbortController()
    const loadVendors = async () => {
      setTableLoading(true)
      try {
        const qs = new URLSearchParams({ page: "1", pageSize: "200", search: search.trim() }).toString()
        const res = await fetch(`/api/vendors?${qs}`, {
          headers: { "x-company-id": session?.user?.companyId ?? "" },
          signal: controller.signal,
        })
        const data = await res.json()
        setVendors(data?.data || [])
      } catch (e) {
        if (process.env.NODE_ENV !== "production") console.error("Failed to load vendors", e)
      } finally {
        setTableLoading(false)
      }
    }
    loadVendors()
    return () => controller.abort()
  }, [session?.user?.companyId, search])

  const filtered = vendors

  const handleSubmit = async (v: Vendor) => {
    try {
      const payload = { ...v, companyId: session?.user?.companyId ?? null }
      if (editVendor?.id) {
        await fetch(`/api/vendors/${editVendor.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } else {
        await fetch(`/api/vendors`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      }
    } finally {
      setEditVendor(undefined)
      setOpenAdd(false)
      // refresh vendors list
      const res = await fetch(`/api/vendors?page=1&pageSize=200`, {
        headers: { "x-company-id": session?.user?.companyId ?? "" },
      })
      const data = await res.json()
      setVendors(data?.data || [])
    }
  }

  const handleDelete = async (v: Vendor) => {
    if (v.presentBalance.amount !== 0) {
      // Show info-only dialog if deletion is not allowed
      setConfirmTitle("Cannot Delete Vendor")
      setConfirmDescription("This vendor has a non-zero present balance. Please settle the balance before deleting.")
      setConfirmAction(undefined)
      setConfirmOpen(true)
      return
    }
    setConfirmTitle("Delete Vendor")
    setConfirmDescription(`Are you sure you want to delete "${v.name}"? This action cannot be undone.`)
    setConfirmAction(() => async () => {
      setLoadingId(v.id)
      setLoadingAction("delete")
      try {
        await fetch(`/api/vendors/${v.id}`, { method: "DELETE" })
        setVendors((prev) => prev.filter((x) => x.id !== v.id))
      } finally {
        setLoadingId(undefined)
        setLoadingAction(undefined)
      }
    })
    setConfirmOpen(true)
  }

  const handleToggleStatus = async (v: Vendor) => {
    setConfirmTitle("Change Status")
    setConfirmDescription(`Change status for "${v.name}" to ${v.active ? "Inactive" : "Active"}?`)
    setConfirmAction(() => async () => {
      setLoadingId(v.id)
      setLoadingAction("toggleStatus")
      try {
        await fetch(`/api/vendors/${v.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ active: !v.active }),
        })
        setVendors((prev) => prev.map((x) => (x.id === v.id ? { ...x, active: !x.active } : x)))
      } finally {
        setLoadingId(undefined)
        setLoadingAction(undefined)
      }
    })
    setConfirmOpen(true)
  }

  return (
    <div className="p-4">
      <div className="mt-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Vendors</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="mt-4">
        <VendorToolbar onAddVendor={() => { setEditVendor(undefined); setOpenAdd(true) }} search={search} onSearchChange={setSearch} />
        {tableLoading && (
          <div className="my-3 text-sm text-gray-600">Loading vendors...</div>
        )}
      <VendorTable
        vendors={filtered}
        onView={(v) => setViewVendor(v)}
        onEdit={(v) => { setEditVendor(v); setOpenAdd(true) }}
        onAddPayment={() => { /* Hook for real payment flow */ }}
        onDelete={handleDelete}
        onToggleStatus={handleToggleStatus}
        loadingId={loadingId}
        loadingAction={loadingAction}
      />
      </div>

      <VendorAddModal open={openAdd} onOpenChange={(v) => setOpenAdd(v)} initialData={editVendor} onSubmit={handleSubmit} productOptions={categories} />
      <VendorViewModal open={!!viewVendor} onOpenChange={() => setViewVendor(undefined)} vendor={viewVendor} />

      {/* Confirmation dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {confirmAction ? (
              <AlertDialogAction
                onClick={async () => {
                  setConfirmOpen(false)
                  await confirmAction()
                }}
              >
                Confirm
              </AlertDialogAction>
            ) : (
              <AlertDialogAction onClick={() => setConfirmOpen(false)}>OK</AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}