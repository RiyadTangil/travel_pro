"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { ChevronsUpDown, Plus, X } from "lucide-react"

type AgentItem = {
  id: string
  name: string
  mobile?: string
  email?: string
}

interface AgentSelectProps {
  value?: string
  onChange: (id: string | undefined, selected?: AgentItem) => void
  onRequestAdd?: () => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
}

function formatLabel(a: AgentItem) {
  const phone = a.mobile ? ` • ${a.mobile}` : ""
  return `${a.name}${phone}`
}

export default function AgentSelect({ value, onChange, onRequestAdd, placeholder = "Select Agent", className, autoFocus }: AgentSelectProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<AgentItem[]>([])
  const [search, setSearch] = useState("")

  const selected = useMemo(() => items.find(i => i.id === value), [items, value])

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    const load = async () => {
      setLoading(true)
      try {
        const qs = new URLSearchParams({ page: "1", limit: "25", search }).toString()
        const res = await fetch(`/api/agents?${qs}`, { signal: controller.signal })
        const data = await res.json()
        const list: AgentItem[] = (data.data || []).map((a: any) => ({ id: a.id, name: a.name, mobile: a.mobile, email: a.email }))
        setItems(list)
      } catch (e) {
        if (process.env.NODE_ENV !== "production") console.error("AgentSelect load error", e)
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [open, search])

  useEffect(() => {
    if (!value || selected) return
    let isMounted = true
    ;(async () => {
      try {
        const res = await fetch(`/api/agents/${value}`)
        if (!res.ok) return
        const data = await res.json()
        const a = data.agent
        if (!a) return
        const item: AgentItem = { id: a.id, name: a.name, mobile: a.mobile, email: a.email }
        if (isMounted) setItems(prev => {
          if (prev.some(p => p.id === item.id)) return prev
          return [item, ...prev]
        })
      } catch (e) {}
    })()
    return () => { isMounted = false }
  }, [value, selected])

  const handleSelect = (id?: string) => {
    const sel = items.find(i => i.id === id)
    onChange(id, sel)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className={`justify-between w-full ${className || ""}`} autoFocus={autoFocus}>
          <span className="truncate text-left">
            {selected ? formatLabel(selected) : (placeholder || "Select Agent")}
          </span>
          <div className="flex items-center gap-2">
            {selected && (
              <X
                className="h-4 w-4 opacity-60 hover:opacity-100"
                onMouseDown={(e) => { e.preventDefault() }}
                onClick={(e) => { e.stopPropagation(); handleSelect(undefined) }}
                title="Clear"
              />
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-60" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[360px]" align="start">
        <Command>
          <div className="px-2 pt-2">
            <Button size="sm" variant="secondary" className="w-full justify-start gap-2" onClick={() => { onRequestAdd?.(); }}>
              <Plus className="h-4 w-4" />
              Add Agent
            </Button>
          </div>
          <CommandInput placeholder="Search agent..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>{loading ? "Loading..." : "No agents found."}</CommandEmpty>
            <CommandGroup>
              {items.map((a) => (
                <CommandItem key={a.id} value={a.id} onSelect={() => handleSelect(a.id)}>
                  {formatLabel(a)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}