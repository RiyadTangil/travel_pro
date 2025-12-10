"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
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
import ClientsManagerToolbar from "@/components/clients/clients-manager-toolbar"
import ClientsManagerTable from "@/components/clients/clients-manager-table"
import AddClientModal from "@/components/clients/add-client-modal"
import { ConfirmationDialog } from "@/components/clients/confirmation-dialog"
import { toast } from "@/components/ui/use-toast"
import Loader from "@/components/ui/loader"

export default function ClientsManagerPage() {
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<{ categoryId?: string; userId?: string; search?: string }>({})
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingClientId, setEditingClientId] = useState<string | null>(null)
  const [initialValues, setInitialValues] = useState<Record<string, any> | undefined>(undefined)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [statusBusyIds, setStatusBusyIds] = useState<string[]>([])
  const [editBusyIds, setEditBusyIds] = useState<string[]>([])
  const router = useRouter()

  const fetchClients = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters.search) params.append("search", filters.search)
      if (filters.categoryId) params.append("categoryId", filters.categoryId)
      if (filters.userId) params.append("userId", filters.userId)
      const res = await fetch(`/api/clients-manager?${params.toString()}`)
      const data = await res.json()
      setClients(data.data || data.clients || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchClients() }, [filters])

  const viewClient = (id: string) => {
    router.push(`/dashboard/clients-manager/${id}`)
  }
  const editClient = async (id: string) => {
    try {
      setEditBusyIds((prev) => [...prev, id])
      const res = await fetch(`/api/clients-manager/${id}`)
      const data = await res.json()
      if (!data || data.error) {
        toast({ title: "Edit", description: data?.error || `Client ${id} not found` })
        setEditBusyIds((prev) => prev.filter((x) => x !== id))
        return
      }
      setEditingClientId(id)
      setInitialValues({
        categoryId: data.categoryId || "",
        clientType: data.clientType || "Individual",
        name: data.name || "",
        email: data.email || "",
        gender: data.gender || "",
        phone: data.phone || "",
        address: data.address || "",
        walkingCustomer: data.walkingCustomer || "No",
        source: data.source || "",
        designation: data.designation || "",
        tradeLicenseNo: data.tradeLicenseNo || "",
        openingBalanceType: data.openingBalanceType || "",
        openingBalanceAmount: String(data.openingBalanceAmount || ""),
        creditLimit: String(data.creditLimit || ""),
      })
      setModalOpen(true)
    } catch (e) {
      toast({ title: "Edit", description: e instanceof Error ? e.message : "Unknown error" })
    } finally {
      setEditBusyIds((prev) => prev.filter((x) => x !== id))
    }
  }
  const deleteClient = (id: string) => {
    setDeletingId(id)
    setConfirmOpen(true)
  }

  const mapped = useMemo(() => {
    return (clients || []).map((c: any, idx: number) => ({
      id: c.id || c._id || String(idx),
      name: c.name,
      type: c.clientType === "Corporate" ? "Corporate" : "Individual",
      phone: c.mobile || c.phone || "",
      email: c.email || "",
      createdBy: c.createdBy || null,
      presentBalance: typeof c.presentBalance === "number" ? c.presentBalance : 0,
      active: !!c.active,
    }))
      .filter((item) => {
        const search = (filters.search || "").toLowerCase()
        if (!search) return true
        return item.name?.toLowerCase().includes(search) || item.email?.toLowerCase().includes(search)
      })
  }, [clients, filters])

  const handleCreate = async (payload: Record<string, any>) => {
    try {
      setSaving(true)
      const res = await fetch(`/api/clients-manager`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to add client")
      toast({ title: "Client added" })
      setModalOpen(false)
      fetchClients()
    } catch (e) {
      toast({ title: "Failed to add", description: e instanceof Error ? e.message : "Unknown error" })
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async (payload: Record<string, any>) => {
    try {
      if (!editingClientId) return
      setSaving(true)
      const res = await fetch(`/api/clients-manager/${editingClientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update client")
      toast({ title: "Client updated" })
      setModalOpen(false)
      setEditingClientId(null)
      fetchClients()
    } catch (e) {
      toast({ title: "Failed to update", description: e instanceof Error ? e.message : "Unknown error" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header (same as dashboard) */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto px-4 py-4">
          <DashboardHeader />
        </div>
      </header>

      <main className="flex-grow   py-6">
        {/* Breadcrumb */}
        <div className="mb-4 px-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Clients</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <Card className="mx-auto  mx-2">
          <CardHeader className="space-y-3">
            <CardTitle className="text-base">Clients Manager</CardTitle>
            <ClientsManagerToolbar onAddClient={() => setModalOpen(true)} onFilterChange={setFilters} />
          </CardHeader>
          <CardContent>
              <ClientsManagerTable 
                clients={mapped} 
                onView={viewClient} 
                onEdit={editClient} 
                onDelete={deleteClient}
                onToggleStatus={async (id, active) => {
                  try {
                    setStatusBusyIds((prev) => [...prev, id])
                    const res = await fetch(`/api/clients-manager/${id}`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ active }),
                    })
                    const data = await res.json()
                    if (!res.ok) throw new Error(data.error || "Failed to update status")
                    toast({ title: "Status Updated", description: `Client is now ${active ? "Active" : "Inactive"}` })
                    fetchClients()
                  } catch (e) {
                    toast({ title: "Failed to update status", description: e instanceof Error ? e.message : "Unknown error" })
                  } finally {
                    setStatusBusyIds((prev) => prev.filter((x) => x !== id))
                  }
                }}
                statusIds={statusBusyIds}
                editingIds={editBusyIds}
              />
          </CardContent>
        </Card>
      </main>

      <AddClientModal 
        open={modalOpen} 
        onOpenChange={(v) => { if (!v) setEditingClientId(null); setModalOpen(v) }} 
        onSubmit={editingClientId ? handleEdit : handleCreate} 
        loading={saving} 
        initialValues={initialValues}
        mode={editingClientId ? "edit" : "add"}
      />

      <ConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete Client"
        description="Are you sure you want to delete this client? This action may archive or remove the record."
        confirmText="Delete"
        variant="destructive"
        onConfirm={async () => {
          if (!deletingId) return
          try {
            const res = await fetch(`/api/clients-manager/${deletingId}`, { method: "DELETE" })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Failed to delete client")
            toast({ title: "Client deleted" })
            setConfirmOpen(false)
            setDeletingId(null)
            fetchClients()
          } catch (e) {
            toast({ title: "Failed to delete", description: e instanceof Error ? e.message : "Unknown error" })
          }
        }}
      />
    </div>
  )
}
