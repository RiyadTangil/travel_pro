"use client"

import { useEffect, useMemo, useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

type Airport = { code: string; name: string; country?: string }

interface AirportRouteSelectProps {
  value: string
  onChange: (next: string) => void
  placeholder?: string
  preloaded?: Airport[]
}

export default function AirportRouteSelect({ value, onChange, placeholder = "PKX->CNS->", preloaded }: AirportRouteSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [items, setItems] = useState<Airport[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    const load = async () => {
      // Use preloaded airports when available; filter client-side by query
      if (preloaded && preloaded.length) {
        setLoading(true)
        try {
          const q = query.toLowerCase().trim()
          const filtered = preloaded.filter(
            (a) => !q || a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q) || (a.country || '').toLowerCase().includes(q)
          )
          if (active) setItems(filtered.slice(0, 500))
        } finally {
          if (active) setLoading(false)
        }
        return
      }
      setLoading(true)
      try {
        const res = await fetch(`/api/airports?q=${encodeURIComponent(query)}&limit=500`, { signal: controller.signal })
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
  }, [query, preloaded])

  const segments = useMemo(() => value?.trim()?.split("->").filter(Boolean) || [], [value])

  const appendCode = (code: string) => {
    const next = segments.length === 0 ? `${code}->` : `${segments.join("->")}->${code}->`
    onChange(next)
  }

  const clearAll = () => {
    onChange("")
    setQuery("")
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={value}
            placeholder={placeholder}
            onClick={() => setOpen(true)}
          />
          {value && (
            <Button type="button" variant="ghost" size="icon" aria-label="Clear route" onClick={clearAll} className="shrink-0">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[420px]" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search airports..." value={query} onValueChange={setQuery} />
          <CommandList>
            {loading ? (
              <CommandEmpty>Loading…</CommandEmpty>
            ) : items.length === 0 ? (
              <CommandEmpty>No airports found.</CommandEmpty>
            ) : (
              <CommandGroup heading="Airports">
                {items.map((a) => (
                  <CommandItem key={`${a.code}-${a.name}`} onSelect={() => appendCode(a.code)}>
                    <span className="font-medium mr-2">{a.code}</span>
                    <span>{a.name}</span>
                    {a.country ? <span className="ml-auto text-muted-foreground">{a.country}</span> : null}
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
