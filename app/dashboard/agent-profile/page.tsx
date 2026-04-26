"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { PageWrapper } from "@/components/shared/page-wrapper"
import { Button } from "@/components/ui/button"
import FilterToolbar from "@/components/shared/filter-toolbar"
import { AgentTable } from "@/components/agents/agent-table"
import { AgentModal } from "@/components/agents/agent-modal"

type Agent = {
  id: string
  name: string
  mobile: string
  email: string
  commissionRate: number
}

export default function AgentProfilePage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [q, setQ] = useState("")
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<"add" | "edit" | "view">("add")
  const [current, setCurrent] = useState<Agent | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [loadingList, setLoadingList] = useState(false)

  const loadAgents = useCallback(async () => {
    try {
      setLoadingList(true)
      const res = await fetch(`/api/agents`)
      const json = await res.json()
      const list: Agent[] = (json.data || []).map((a: any) => ({
        id: a.id,
        name: a.name,
        mobile: a.mobile,
        email: a.email,
        commissionRate: Number(a.commissionRate || 0),
      }))
      setAgents(list)
    } catch (e) {
      console.error("Failed to load agents", e)
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => {
    void loadAgents()
  }, [loadAgents])

  const filtered = useMemo(() => {
    if (!q) return agents
    const s = q.toLowerCase()
    return agents.filter(
      (a) => a.name.toLowerCase().includes(s) || a.mobile.includes(q) || a.email.toLowerCase().includes(s)
    )
  }, [q, agents])

  const handleAdd = async (payload: any) => {
    try {
      const res = await fetch(`/api/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Failed to create agent")
      const id = json.id
      setAgents((prev) => [
        ...prev,
        {
          id,
          name: payload.name,
          mobile: payload.mobile || payload.phone || "",
          email: payload.email || "",
          commissionRate: Number(payload.commissionRate) || 0,
        },
      ])
    } catch (e) {
      console.error(e)
    }
  }

  const handleUpdate = async (payload: any) => {
    if (!current) return
    setLoadingId(current.id)
    try {
      const res = await fetch(`/api/agents/${current.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Failed to update agent")
      setAgents((prev) =>
        prev.map((a) =>
          a.id === current.id
            ? {
                ...a,
                name: payload.name,
                mobile: payload.mobile || payload.phone || "",
                email: payload.email || "",
                commissionRate: Number(payload.commissionRate) || 0,
              }
            : a
        )
      )
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingId(null)
    }
  }

  const handleDelete = async (item: Agent) => {
    setLoadingId(item.id)
    try {
      const res = await fetch(`/api/agents/${item.id}`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Failed to delete agent")
      setAgents((prev) => prev.filter((a) => a.id !== item.id))
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <PageWrapper breadcrumbs={[{ label: "Agent Profile" }]}>
      <div className="mx-4 mb-4 min-w-0 space-y-4">
        <FilterToolbar
          showSearch
          search={q}
          onSearchChange={setQ}
          searchPlaceholder="Search by name, mobile, email..."
          showRefresh
          onRefresh={() => void loadAgents()}
          className="flex-1 min-w-0"
        >
          <Button
            type="button"
            onClick={() => {
              setMode("add")
              setCurrent(null)
              setOpen(true)
            }}
            className="shrink-0 whitespace-nowrap"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Agent
          </Button>
        </FilterToolbar>

        <AgentTable
          data={filtered}
          loading={loadingList}
          loadingId={loadingId}
          onView={(item) => {
            setMode("view")
            setCurrent(item)
            setOpen(true)
          }}
          onEdit={(item) => {
            setMode("edit")
            setCurrent(item)
            setOpen(true)
          }}
          onDelete={handleDelete}
        />
      </div>

      <AgentModal
        open={open}
        onClose={() => setOpen(false)}
        mode={mode}
        initialData={current || undefined}
        onSubmit={async (payload) => {
          if (mode === "add") await handleAdd(payload)
          else if (mode === "edit") await handleUpdate(payload)
        }}
      />
    </PageWrapper>
  )
}
