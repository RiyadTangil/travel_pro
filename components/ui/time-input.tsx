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
  twelveHour?: boolean
  wheelStepMinutes?: number
}

export function TimeInput({ value, onChange, placeholder = "Pick a time", className, twelveHour = false, wheelStepMinutes = 15 }: TimeInputProps) {
  const [open, setOpen] = useState(false)

  const times = useMemo(() => {
    const list: string[] = []
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += wheelStepMinutes) {
        const hh = h.toString().padStart(2, "0")
        const mm = m.toString().padStart(2, "0")
        list.push(`${hh}:${mm}`)
      }
    }
    return list
  }, [wheelStepMinutes])

  const toDisplay = (t?: string) => {
    if (!t || !twelveHour) return t || placeholder
    const [hhStr, mmStr] = t.split(":")
    const hh = Number(hhStr)
    const mm = Number(mmStr)
    const am = hh < 12
    const hour12 = hh % 12 === 0 ? 12 : hh % 12
    return `${hour12}:${mmStr} ${am ? "AM" : "PM"}`
  }

  const adjustByWheel = (direction: 1 | -1) => {
    // Find current index; if unset, approximate to nearest current time
    let idx = value ? times.indexOf(value) : -1
    if (idx === -1) {
      const now = new Date()
      const hh = now.getHours()
      const mm = now.getMinutes()
      const step = wheelStepMinutes
      const snapped = Math.round(mm / step) * step
      const hhStr = hh.toString().padStart(2, "0")
      const mmStr = String(snapped % 60).padStart(2, "0")
      const candidate = `${hhStr}:${mmStr}`
      idx = times.indexOf(candidate)
      if (idx === -1) idx = 0
    }
    let next = idx + direction
    if (next < 0) next = times.length - 1
    if (next >= times.length) next = 0
    const newVal = times[next]
    onChange?.(newVal)
  }

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
          onWheel={(e) => { e.preventDefault(); adjustByWheel(e.deltaY < 0 ? -1 : 1) }}
        >
          <span className={cn("truncate", !value && "text-gray-500")}>
            {toDisplay(value)}
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
                  {twelveHour ? toDisplay(t) : t}
                </button>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
