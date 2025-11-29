"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { ChevronsUpDown, Plus, X } from "lucide-react"

type ClientItem = {
  id: string
  name: string
  uniqueId?: number
  email?: string
  phone?: string
}

interface ClientSelectProps {
  value?: string
  onChange: (id: string | undefined, selected?: ClientItem) => void
  onRequestAdd?: () => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
  preloaded?: ClientItem[]
}

// Formats like: NAME - (CL-0001)
function formatLabel(c: ClientItem) {
  const code = typeof c.uniqueId === "number" ? `CL-${String(c.uniqueId).padStart(4, "0")}` : "CL-XXXX"
  return `${c.name} - (${code})`
}

export default function ClientSelect({ value, onChange, onRequestAdd, placeholder = "Select Client", className, autoFocus, preloaded }: ClientSelectProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<ClientItem[]>([])
  const [search, setSearch] = useState("")

  const selected = useMemo(() => items.find(i => i.id === value), [items, value])

  useEffect(() => {
    if (preloaded && preloaded.length && items.length === 0) {
      setItems(preloaded)
    }
  }, [preloaded])

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    const load = async () => {
      setLoading(true)
      try {
        if (preloaded && preloaded.length) {
          const filtered = search.trim() ? preloaded.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || (i.phone || "").includes(search) || (i.email || "").toLowerCase().includes(search.toLowerCase())) : preloaded
          setItems(filtered)
        } else {
          const qs = new URLSearchParams({ page: "1", limit: "25", search }).toString()
          const res = await fetch(`/api/clients-manager?${qs}`, { signal: controller.signal })
          const data = await res.json()
          const list: ClientItem[] = (data.clients || []).map((c: any) => ({ id: c.id, name: c.name, uniqueId: c.uniqueId, email: c.email, phone: c.phone }))
          setItems(list)
        }
      } catch (e) {
        if (process.env.NODE_ENV !== "production") console.error("ClientSelect load error", e)
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [open, search, preloaded])

  // When a value is externally set but not in items yet, fetch that item
  useEffect(() => {
    if (!value || selected) return
    let isMounted = true
      ; (async () => {
        try {
          const res = await fetch(`/api/clients-manager/${value}`)
          if (!res.ok) return
          const data = await res.json()
          const c = data.client
          if (!c) return
          const item: ClientItem = { id: c.id, name: c.name, uniqueId: c.uniqueId, email: c.email, phone: c.phone }
          if (isMounted) setItems(prev => {
            // avoid duplicates
            if (prev.some(p => p.id === item.id)) return prev
            return [item, ...prev]
          })
        } catch (e) { }
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
        <Button variant="outline" role="combobox" aria-expanded={open} className={`justify-between hover:bg-gray-10 w-full ${className || ""}`}
          autoFocus={autoFocus}
        >
          <span className="truncate text-left">
            {selected ? formatLabel(selected) : (placeholder || "Select Client")}
          </span>
          <div className="flex items-center gap-2" onMouseDown={(e) => { e.preventDefault() }}
            onClick={(e) => { e.stopPropagation(); handleSelect(undefined) }}>
            {selected && (
              <X
                className="h-4 w-4 opacity-60 hover:opacity-100 cursor-pointer rounded-full border border-solid border-gray-300 bg-gray-300 w-4 h-4 px-0.5"
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
              Add Client
            </Button>
          </div>
          <CommandInput placeholder="Search client..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>{loading ? "Loading..." : "No clients found."}</CommandEmpty>
            <CommandGroup>
              {items.map((c) => (
                <CommandItem key={c.id} value={c.id} onSelect={() => handleSelect(c.id)}>
                  {formatLabel(c)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
