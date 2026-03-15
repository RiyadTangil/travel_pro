"use client"

import { useEffect, useMemo, useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"

type Airport = { code: string; name: string; country?: string }

interface AirportSelectProps {
  value?: string
  onChange: (code: string) => void
  placeholder?: string
  className?: string
  preloaded?: Airport[]
}

export default function AirportSelect({ 
  value, 
  onChange, 
  placeholder = "Select airport", 
  className,
  preloaded 
}: AirportSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [items, setItems] = useState<Airport[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open && !query) return // Only fetch if open or searching

    let active = true
    const controller = new AbortController()
    const load = async () => {
      if (preloaded && preloaded.length) {
        setLoading(true)
        try {
          const q = query.toLowerCase().trim()
          const filtered = preloaded.filter(
            (a) => !q || a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q) || (a.country || '').toLowerCase().includes(q)
          )
          if (active) setItems(filtered.slice(0, 100))
        } finally {
          if (active) setLoading(false)
        }
        return
      }
      
      setLoading(true)
      try {
        const res = await fetch(`/api/airports?q=${encodeURIComponent(query)}&limit=100`, { signal: controller.signal })
        const data = await res.json()
        if (active) setItems(data.items || [])
      } catch (e) {
        if (active) setItems([])
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false; controller.abort() }
  }, [query, preloaded, open])

  const displayValue = useMemo(() => {
    if (!value) return ""
    const item = items.find(i => i.code === value) || (preloaded?.find(i => i.code === value))
    if (item) return `${item.code} - ${item.name}`
    return value
  }, [value, items, preloaded])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        >
          <span className="truncate">
            {displayValue || <span className="text-muted-foreground">{placeholder}</span>}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {value && (
              <X 
                className="h-3 w-3 opacity-50 hover:opacity-100 cursor-pointer" 
                onClick={(e) => {
                  e.stopPropagation()
                  onChange("")
                }}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[300px]" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search airports..." value={query} onValueChange={setQuery} className="h-8 text-xs" />
          <CommandList className="max-h-[200px]">
            {loading ? (
              <CommandEmpty className="py-2 text-xs text-center">Loading…</CommandEmpty>
            ) : items.length === 0 ? (
              <CommandEmpty className="py-2 text-xs text-center">No airports found.</CommandEmpty>
            ) : (
              <CommandGroup heading="Airports">
                {items.map((a) => (
                  <CommandItem 
                    key={`${a.code}-${a.name}`} 
                    onSelect={() => {
                      onChange(a.code)
                      setOpen(false)
                    }}
                    className="text-xs"
                  >
                    <span className="font-bold mr-2">{a.code}</span>
                    <span className="truncate">{a.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
