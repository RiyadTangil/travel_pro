"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { ChevronsUpDown, Plus, X } from "lucide-react"

type EmployeeItem = {
  id: string
  name: string
  department?: string
  designation?: string
  mobile?: string
  email?: string
}

interface EmployeeSelectProps {
  value?: string
  onChange: (id: string | undefined, selected?: EmployeeItem) => void
  onRequestAdd?: () => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
}

function formatLabel(e: EmployeeItem) {
  const dept = e.department ? ` • ${e.department}` : ""
  return `${e.name}${dept}`
}

export default function EmployeeSelect({ value, onChange, onRequestAdd, placeholder = "Select Employee", className, autoFocus }: EmployeeSelectProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<EmployeeItem[]>([])
  const [search, setSearch] = useState("")

  const selected = useMemo(() => items.find(i => i.id === value), [items, value])

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    const load = async () => {
      setLoading(true)
      try {
        const qs = new URLSearchParams({ page: "1", limit: "25", search }).toString()
        const res = await fetch(`/api/employees?${qs}`, { signal: controller.signal })
        const data = await res.json()
        const list: EmployeeItem[] = (data.employees || []).map((e: any) => ({ id: e.id, name: e.name, department: e.department, designation: e.designation, mobile: e.mobile, email: e.email }))
        setItems(list)
      } catch (e) {
        if (process.env.NODE_ENV !== "production") console.error("EmployeeSelect load error", e)
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
      ; (async () => {
        try {
          const res = await fetch(`/api/employees/${value}`)
          if (!res.ok) return
          const data = await res.json()
          const e = data.employee
          if (!e) return
          const item: EmployeeItem = { id: e.id, name: e.name, department: e.department, designation: e.designation, mobile: e.mobile, email: e.email }
          if (isMounted) setItems(prev => {
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
        <Button variant="outline" role="combobox" aria-expanded={open} className={`justify-between w-full ${className || ""}`} autoFocus={autoFocus}>
          <span className="truncate text-left">
            {selected ? formatLabel(selected) : (placeholder || "Select Employee")}
          </span>
          <div className="flex items-center gap-2" onMouseDown={(e) => { e.preventDefault() }}
            onClick={(e) => { e.stopPropagation(); handleSelect(undefined) }}>
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
              Add Employee
            </Button>
          </div>
          <CommandInput placeholder="Search employee..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>{loading ? "Loading..." : "No employees found."}</CommandEmpty>
            <CommandGroup>
              {items.map((e) => (
                <CommandItem key={e.id} value={e.id} onSelect={() => handleSelect(e.id)}>
                  {formatLabel(e)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}