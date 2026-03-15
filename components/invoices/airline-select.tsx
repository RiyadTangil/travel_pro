"use client"

import { useEffect, useMemo, useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface AirlineSelectProps {
  value?: string
  onChange: (name: string) => void
  placeholder?: string
  className?: string
  options?: string[]
}

export default function AirlineSelect({ 
  value, 
  onChange, 
  placeholder = "Select airline", 
  className,
  options = [] 
}: AirlineSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return options.filter(o => !q || o.toLowerCase().includes(q)).slice(0, 100)
  }, [options, query])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          className={cn(
            "flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        >
          <span className="truncate">
            {value || <span className="text-muted-foreground">{placeholder}</span>}
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
      <PopoverContent className="p-0 w-[250px]" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search airlines..." value={query} onValueChange={setQuery} className="h-8 text-xs" />
          <CommandList className="max-h-[200px]">
            {filtered.length === 0 ? (
              <CommandEmpty className="py-2 text-xs text-center">No airlines found.</CommandEmpty>
            ) : (
              <CommandGroup heading="Airlines">
                {filtered.map((a) => (
                  <CommandItem 
                    key={a} 
                    onSelect={() => {
                      onChange(a)
                      setOpen(false)
                    }}
                    className="text-xs"
                  >
                    {a}
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
