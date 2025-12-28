"use client"

import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface Option {
  label: string
  value: string
}

interface ClearableSelectProps {
  options: Option[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  error?: boolean
}

export function ClearableSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  className,
  disabled,
  error,
}: ClearableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const selected = options.find((option) => option.value === value)

  const handleSelect = (currentValue: string) => {
    onChange(currentValue === value ? "" : currentValue)
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange("")
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            error && "border-red-500",
            className
          )}
          disabled={disabled}
        >
          <span className="truncate">
            {selected ? selected.label : placeholder}
          </span>
          <div className="flex items-center gap-1">
             {value && !disabled && (
                <div 
                  className="rounded-full hover:bg-slate-200 p-0.5 cursor-pointer z-10" 
                  onClick={handleClear}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <X className="h-3 w-3 opacity-50 hover:opacity-100" />
                </div>
             )}
             <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${placeholder.toLowerCase()}...`} value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label} // Search by label
                  onSelect={() => handleSelect(option.value)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
