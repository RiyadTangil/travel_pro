"use client"

import { useMemo, useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Clock, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface TimeInputProps {
  value?: string // HH:mm
  onChange?: (time: string | undefined) => void
  placeholder?: string
  className?: string
}

export function TimeInput({ value, onChange, placeholder = "Pick a time", className }: TimeInputProps) {
  const [open, setOpen] = useState(false)

  const times = useMemo(() => {
    const list: string[] = []
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 15) {
        const hh = h.toString().padStart(2, "0")
        const mm = m.toString().padStart(2, "0")
        list.push(`${hh}:${mm}`)
      }
    }
    return list
  }, [])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-full h-9 px-3 rounded-md border bg-white text-left flex items-center justify-between",
            "focus:outline-none focus:ring-2 focus:ring-blue-500",
            className
          )}
          onClick={() => setOpen(true)}
        >
          <span className={cn("truncate", !value && "text-gray-500")}>
            {value || placeholder}
          </span>
          <span className="flex items-center gap-2">
            {value && (
              <X
                className="h-4 w-4 text-gray-400 hover:text-gray-600"
                onMouseDown={(e) => { e.preventDefault() }}
                onClick={(e) => { e.stopPropagation(); onChange?.(undefined) }}
                title="Clear"
              />
            )}
            <Clock className="h-4 w-4 text-gray-400" />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-0" align="start">
        <ScrollArea className="h-56">
          <ul className="divide-y">
            {times.map((t) => (
              <li key={t}>
                <button
                  type="button"
                  className={cn("w-full text-left px-3 py-2 hover:bg-gray-50", t === value && "bg-gray-100")}
                  onClick={() => { onChange?.(t); setOpen(false) }}
                >
                  {t}
                </button>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}