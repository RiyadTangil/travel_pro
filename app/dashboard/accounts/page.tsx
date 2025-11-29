"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCcw, Plus } from "lucide-react"
import AccountTable from "@/components/accounts/account-table"
import AccountModal from "@/components/accounts/account-modal"
import type { AccountItem } from "@/components/accounts/types"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { InlineLoader } from "@/components/ui/loader"

const initialData: AccountItem[] = []

export default function AccountsPage() {
  const [items, setItems] = useState<AccountItem[]>(initialData)
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<AccountItem | null>(null)
  const [deleting, setDeleting] = useState<AccountItem | null>(null)
  const [loadingRowId, setLoadingRowId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [loadingList, setLoadingList] = useState(false)

  const handleAddClick = () => { setEditing(null); setOpen(true) }
  const handleEdit = (item: AccountItem) => { setEditing(item); setOpen(true) }
  const handleDelete = (item: AccountItem) => {
    if (item.hasTrxn) return // protected by backend too; UX: do nothing
    setDeleting(item)
  }

  const loadItems = async () => {
    setLoadingList(true)
    try {
      const res = await fetch(`/api/accounts?q=${encodeURIComponent(search)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to load accounts")
      setItems(data.items || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(loadItems, 250)
    return () => clearTimeout(t)
  }, [search])

  const onSubmit = async (payload: AccountItem) => {
    setSubmitting(true)
    try {
      if (editing) {
        const res = await fetch(`/api/accounts/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: payload.name,
            type: payload.type,
            accountNo: payload.accountNo,
            bankName: payload.bankName,
            routingNo: payload.routingNo,
            cardNo: payload.cardNo,
            branch: payload.branch,
            lastBalance: payload.lastBalance,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || "Update failed")
        setItems((prev) => prev.map((p) => (p.id === editing.id ? { ...p, ...payload } : p)))
      } else {
        const res = await fetch(`/api/accounts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: payload.name,
            type: payload.type,
            accountNo: payload.accountNo,
            bankName: payload.bankName,
            routingNo: payload.routingNo,
            cardNo: payload.cardNo,
            branch: payload.branch,
            lastBalance: payload.lastBalance,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || "Create failed")
        const id = data?.id || String(Date.now())
        setItems((prev) => [{ ...payload, id, hasTrxn: false }, ...prev])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
      setOpen(false)
      setEditing(null)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setLoadingRowId(deleting.id)
    try {
      const res = await fetch(`/api/accounts/${deleting.id}`, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Delete failed")
      setItems((prev) => prev.filter((p) => p.id !== deleting.id))
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingRowId(null)
      setDeleting(null)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg">Accounts</CardTitle>
          <Button variant="ghost" size="icon" aria-label="Refresh" onClick={loadItems} disabled={loadingList}>
            {loadingList ? <InlineLoader /> : <RefreshCcw className="h-4 w-4" />}
          </Button>
        </div>
        <Button className="bg-sky-500 hover:bg-sky-600" onClick={handleAddClick}><Plus className="h-4 w-4 mr-2" /> Add Account</Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <AccountTable
            items={items}
            search={search}
            onSearchChange={setSearch}
            onEdit={handleEdit}
            onDelete={handleDelete}
            loadingRowId={loadingRowId}
          />
        </CardContent>
      </Card>

      <AccountModal open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null) }} initialItem={editing} onSubmit={onSubmit} submitting={submitting} />

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete {deleting?.name}?</p>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleting(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              {loadingRowId === deleting?.id ? (<span className="flex items-center gap-2"><InlineLoader /> Deleting...</span>) : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}