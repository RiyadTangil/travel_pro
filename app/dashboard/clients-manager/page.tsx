"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { PageWrapper } from "@/components/shared/page-wrapper"
import FilterToolbar from "@/components/shared/filter-toolbar"
import { Button } from "@/components/ui/button"
import { Download, Plus } from "lucide-react"
import { ClearableSelect } from "@/components/shared/clearable-select"
import ClientsManagerTable from "@/components/clients/clients-manager-table"
import AddClientModal from "@/components/clients/add-client-modal"
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog"
import { toast } from "@/components/ui/use-toast"

type Category = { id: string; name: string }
type User = { id: string; name: string }

export default function ClientsManagerPage() {
  const { data: session } = useSession()
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<{ categoryId?: string; userId?: string; search?: string; status?: string }>({})
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingClientId, setEditingClientId] = useState<string | null>(null)
  const [initialValues, setInitialValues] = useState<Record<string, any> | undefined>(undefined)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [statusBusyIds, setStatusBusyIds] = useState<string[]>([])
  const [editBusyIds, setEditBusyIds] = useState<string[]>([])
  const router = useRouter()

  const [categories, setCategories] = useState<Category[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [categoryId, setCategoryId] = useState<string | undefined>()
  const [userId, setUserId] = useState<string | undefined>()
  const [status, setStatus] = useState<string | undefined>()
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch(`/api/clients/client-categories?page=1&pageSize=100`)
      .then((r) => r.json())
      .then((data) => setCategories(data.data || []))
      .catch(() => setCategories([]))
    fetch(`/api/users`)
      .then((r) => r.json())
      .then((data) => setUsers(data.data || []))
      .catch(() => setUsers([]))
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({
        categoryId,
        userId,
        search: search.trim(),
        status,
      })
    }, 300)
    return () => clearTimeout(timer)
  }, [categoryId, userId, search, status])

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters.search) params.append("search", filters.search)
      if (filters.categoryId) params.append("categoryId", filters.categoryId)
      if (filters.userId) params.append("userId", filters.userId)
      if (filters.status) params.append("status", filters.status)
      const res = await fetch(`/api/clients-manager?${params.toString()}`)
      const { data } = await res.json()
      setClients(data.data || data.clients || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    void fetchClients()
  }, [fetchClients])

  const viewClient = (id: string) => {
    router.push(`/dashboard/clients-manager/${id}`)
  }

  const editClient = async (id: string) => {
    try {
      setEditBusyIds((prev) => [...prev, id])
      const res = await fetch(`/api/clients-manager/${id}`)
      const data = await res.json()
      if (!data?.data || data.error) {
        toast({ title: "Edit", description: data?.error || data?.message || `Client ${id} not found` })
        setEditBusyIds((prev) => prev.filter((x) => x !== id))
        return
      }
      const clientData = data.data
      setEditingClientId(id)

      const phoneValue = clientData.phone || clientData.mobile || ""

      setInitialValues({
        categoryId: clientData.categoryId ? String(clientData.categoryId) : "",
        clientType: clientData.clientType || "Individual",
        name: clientData.name || "",
        email: clientData.email || "",
        gender: clientData.gender || "",
        phone: phoneValue,
        address: clientData.address || "",
        walkingCustomer: clientData.walkingCustomer || "No",
        source: clientData.source || "",
        designation: clientData.designation || "",
        tradeLicenseNo: clientData.tradeLicenseNo || "",
        openingBalanceType: clientData.openingBalanceType || "",
        openingBalanceAmount: String(clientData.openingBalanceAmount || ""),
        creditLimit: String(clientData.creditLimit || ""),
      })
      setModalOpen(true)
    } catch (e) {
      toast({ title: "Edit", description: e instanceof Error ? e.message : "Unknown error" })
    } finally {
      setEditBusyIds((prev) => prev.filter((x) => x !== id))
    }
  }

  const handleOpenAddModal = () => {
    setEditingClientId(null)
    setInitialValues(undefined)
    setModalOpen(true)
  }

  const deleteClient = (id: string) => {
    setDeletingId(id)
    setConfirmOpen(true)
  }

  const toggleStatus = async (id: string, active: boolean) => {
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
  }

  const mapped = useMemo(() => {
    return (clients || []).map((c: any, idx: number) => ({
      id: c.id || c._id || String(idx),
      uniqueId: c.uniqueId != null ? String(c.uniqueId) : undefined,
      name: c.name,
      type: c.clientType === "Corporate" ? "Corporate" : "Individual",
      phone: c.mobile || c.phone || "",
      email: c.email || "",
      createdBy: c.createdBy || null,
      presentBalance: typeof c.presentBalance === "number" ? c.presentBalance : 0,
      active: !!c.active,
    }))
  }, [clients])

  const categoryOptions = useMemo(() => categories.map((c) => ({ label: c.name, value: c.id })), [categories])
  const userOptions = useMemo(() => users.map((u) => ({ label: u.name, value: u.id })), [users])
  const statusOptions = [
    { label: "Active", value: "active" },
    { label: "Inactive", value: "inactive" },
  ]

  const handleCreate = async (payload: Record<string, any>) => {
    try {
      setSaving(true)
      const res = await fetch(`/api/clients-manager`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.user?.companyId ? { "x-company-id": String(session.user.companyId) } : {}),
        },
        body: JSON.stringify({
          ...payload,
          ...(session?.user?.companyId ? { companyId: String(session.user.companyId) } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || data.error || "Failed to add client")
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
      if (!res.ok) throw new Error(data.message || data.error || "Failed to update client")
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
    <PageWrapper breadcrumbs={[{ label: "Clients" }]}>
      <div className="mx-4 mb-4 min-w-0 space-y-4">
        <FilterToolbar
          showSearch
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search clients..."
          showRefresh
          onRefresh={() => void fetchClients()}
          filterExtrasBefore={
            <>
              <div className="w-52 shrink-0">
                <ClearableSelect
                  options={categoryOptions}
                  value={categoryId}
                  onChange={(val) => setCategoryId(val || undefined)}
                  placeholder="Select Category"
                />
              </div>
              <div className="w-48 shrink-0">
                <ClearableSelect
                  options={userOptions}
                  value={userId}
                  onChange={(val) => setUserId(val || undefined)}
                  placeholder="Select User"
                />
              </div>
              <div className="w-40 shrink-0">
                <ClearableSelect
                  options={statusOptions}
                  value={status}
                  onChange={(val) => setStatus(val || undefined)}
                  placeholder="Select Status"
                />
              </div>
            </>
          }
          className="flex-1 min-w-0"
        >
          <div className="flex shrink-0 gap-2">
            <Button type="button" onClick={handleOpenAddModal} >
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Button>
            <Button type="button" variant="outline" className="whitespace-nowrap">
              <Download className="mr-2 h-4 w-4" />
              Excel Report
            </Button>
          </div>
        </FilterToolbar>

        <ClientsManagerTable
          rows={mapped}
          onView={viewClient}
          onEdit={editClient}
          onDelete={deleteClient}
          onToggleStatus={toggleStatus}
          statusIds={statusBusyIds}
          editingIds={editBusyIds}
          loading={loading}
        />
      </div>

      <AddClientModal
        open={modalOpen}
        onOpenChange={(v) => {
          if (!v) setEditingClientId(null)
          setModalOpen(v)
        }}
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
            if (!res.ok) {
              const errorMsg = data.message || data.error || "Failed to delete client"
              toast({ title: "Error", description: errorMsg })
              return
            }
            toast({ title: "Deleted", description: "Client has been removed" })
            fetchClients()
          } catch (e) {
            toast({ title: "Error", description: "Network error while deleting" })
          } finally {
            setDeletingId(null)
          }
        }}
      />
    </PageWrapper>
  )
}
