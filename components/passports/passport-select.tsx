"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { ChevronsUpDown, Plus, X } from "lucide-react"

type PassportItem = {
  id: string
  passportNo: string
  name?: string
  // Optional fields if caller preloads richer data
  paxType?: string
  mobile?: string
  email?: string
  dob?: string
  dateOfIssue?: string
  dateOfExpire?: string
}

interface PassportSelectProps {
  value?: string
  onChange: (id: string | undefined, selected?: PassportItem) => void
  onRequestAdd?: () => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
  preloaded?: PassportItem[]
}

function formatLabel(p: PassportItem) {
  const nm = p.name ? ` • ${p.name}` : ""
  return `${p.passportNo}${nm}`
}

export default function PassportSelect({ value, onChange, onRequestAdd, placeholder = "Select Passport", className, autoFocus, preloaded }: PassportSelectProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<PassportItem[]>(preloaded || [])
  const [search, setSearch] = useState("")

  const selected = useMemo(() => items.find(i => i.id === value), [items, value])

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    const load = async () => {
      // If preloaded is provided, prefer local filtering to avoid network
      if (preloaded && preloaded.length) {
        setLoading(true)
        try {
          const s = search.trim().toLowerCase()
          const filtered = preloaded.filter(p => {
            if (!s) return true
            const label = `${p.passportNo} ${p.name || ''}`.toLowerCase()
            return label.includes(s)
          })
          setItems(filtered)
        } finally {
          setLoading(false)
        }
        return
      }
      setLoading(true)
      try {
        const qs = new URLSearchParams({ page: "1", limit: "25", search }).toString()
        const res = await fetch(`/api/passports?${qs}`, { signal: controller.signal })
        const data = await res.json()
        const list: PassportItem[] = (data.passports || []).map((p: any) => ({ id: p.id || String(p._id), passportNo: p.passportNo, name: p.name }))
        setItems(list)
      } catch (e) {
        if (process.env.NODE_ENV !== "production") console.error("PassportSelect load error", e)
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [open, search, preloaded])

  useEffect(() => {
    if (!value || selected) return
    let isMounted = true
      ; (async () => {
        try {
          // If preloaded contains this value, add it locally and skip network
          const preload = preloaded?.find(p => p.id === value)
          if (preload) {
            if (isMounted) setItems(prev => {
              if (prev.some(pp => pp.id === preload.id)) return prev
              return [preload, ...prev]
            })
            return
          }
          const res = await fetch(`/api/passports/${value}`)
          if (!res.ok) return
          const data = await res.json()
          const p = data.passport
          if (!p) return
          const item: PassportItem = { id: p.id || String(p._id), passportNo: p.passportNo, name: p.name }
          if (isMounted) setItems(prev => {
            if (prev.some(pp => pp.id === item.id)) return prev
            return [item, ...prev]
          })
        } catch (e) { }
      })()
    return () => { isMounted = false }
  }, [value, selected, preloaded])

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
            {selected ? formatLabel(selected) : (placeholder || "Select Passport")}
          </span>
          <div className="flex items-center gap-2 " onClick={(e) => { e.stopPropagation(); handleSelect(undefined) }} onMouseDown={(e) => { e.preventDefault() }}
          >
            {selected && (
              <X
                className="h-4 w-4 opacity-60 hover:opacity-100"
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
              Add Passport
            </Button>
          </div>
          <CommandInput placeholder="Search passport..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>{loading ? "Loading..." : "No passports found."}</CommandEmpty>
            <CommandGroup>
              {items.map((p) => (
                <CommandItem key={p.id} value={p.id} onSelect={() => handleSelect(p.id)}>
                  {formatLabel(p)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
