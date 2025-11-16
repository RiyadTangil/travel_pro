"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { ChevronsUpDown, Plus, X } from "lucide-react"

type VendorItem = {
  id: string
  name: string
  email?: string
  mobile?: string
}

interface VendorSelectProps {
  value?: string
  onChange: (id: string | undefined, selected?: VendorItem) => void
  onRequestAdd?: () => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
}

function formatLabel(v: VendorItem) {
  const contact = v.mobile ? v.mobile : v.email ? v.email : ""
  return contact ? `${v.name} - (${contact})` : v.name
}

export default function VendorSelect({ value, onChange, onRequestAdd, placeholder = "Select Vendor", className, autoFocus }: VendorSelectProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<VendorItem[]>([])
  const [search, setSearch] = useState("")

  const selected = useMemo(() => items.find(i => i.id === value), [items, value])

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    const load = async () => {
      setLoading(true)
      try {
        const qs = new URLSearchParams({ page: "1", pageSize: "25" }).toString()
        const res = await fetch(`/api/vendors?${qs}`, { signal: controller.signal })
        const data = await res.json()
        const list: VendorItem[] = (data.data || []).map((v: any) => ({ id: v.id, name: v.name, email: v.email, mobile: v.mobile }))
        const filtered = search.trim() ? list.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || (i.mobile || "").includes(search) || (i.email || "").toLowerCase().includes(search.toLowerCase())) : list
        setItems(filtered)
      } catch (e) {
        if (process.env.NODE_ENV !== "production") console.error("VendorSelect load error", e)
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
        const res = await fetch(`/api/vendors/${value}`)
        if (!res.ok) return
        const data = await res.json()
        const v = data.vendor
        if (!v) return
        const item: VendorItem = { id: v.id, name: v.name, email: v.email, mobile: v.mobile }
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
        <Button variant="outline" role="combobox" aria-expanded={open} className={`justify-between w-full ${className || ""}`}
          autoFocus={autoFocus}
        >
          <span className="truncate text-left">
            {selected ? formatLabel(selected) : (placeholder || "Select Vendor")}
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
              Add Vendor
            </Button>
          </div>
          <CommandInput placeholder="Search vendor..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>{loading ? "Loading..." : "No vendors found."}</CommandEmpty>
            <CommandGroup>
              {items.map((v) => (
                <CommandItem key={v.id} value={v.id} onSelect={() => handleSelect(v.id)}>
                  {formatLabel(v)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}