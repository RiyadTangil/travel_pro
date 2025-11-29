"use client"

import { useEffect, useMemo, useState } from "react"
import TransportTypeTable, { TransportTypeRow } from "@/components/config/transport-types/transport-type-table"
import TransportTypeModal, { TransportTypeItem } from "@/components/config/transport-types/transport-type-modal"
import { Button } from "@/components/ui/button"
import { InlineLoader } from "@/components/ui/loader"

async function fetchTransportTypes(): Promise<TransportTypeRow[]> {
  const res = await fetch("/api/transport-types", { cache: "no-store" })
  const data = await res.json()
  return data.items || []
}

export default function TransportTypesPage() {
  const [items, setItems] = useState<TransportTypeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<TransportTypeRow | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const list = await fetchTransportTypes()
      setItems(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleAdd = () => { setEditing(null); setModalOpen(true) }

  const handleSubmit = async (payload: TransportTypeItem) => {
    setSubmitting(true)
    try {
      if (payload.id) {
        setEditingId(payload.id)
        await fetch(`/api/transport-types/${payload.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: payload.name, active: payload.active }) })
        setEditingId(null)
      } else {
        await fetch(`/api/transport-types`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: payload.name, active: payload.active }) })
      }
      await load()
      setModalOpen(false)
    } finally {
      setSubmitting(false)
    }
  }

  const onEdit = (row: TransportTypeRow) => { setEditing(row); setModalOpen(true) }
  const onDelete = async (row: TransportTypeRow) => {
    setDeletingId(row.id)
    try {
      await fetch(`/api/transport-types/${row.id}`, { method: "DELETE" })
      await load()
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Transport Types</h2>
        <Button className="bg-sky-500 hover:bg-sky-600" onClick={handleAdd}>
          + Add New Transport Type
        </Button>
      </div>
      {loading ? (
        <div className="flex items-center gap-2"><InlineLoader /> Loading list…</div>
      ) : (
        <TransportTypeTable items={items} onEdit={onEdit} onDelete={onDelete} editingId={editingId} deletingId={deletingId} />
      )}

      <TransportTypeModal open={modalOpen} onOpenChange={setModalOpen} initialItem={editing ? { id: editing.id, name: editing.name, active: editing.active } : null} onSubmit={handleSubmit} submitting={submitting} />
    </div>
  )
}

