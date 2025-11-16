"use client"

import { useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { CalendarIcon, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

interface DateInputProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function DateInput({ value, onChange, placeholder = "Pick a date", className, disabled }: DateInputProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-full h-9 px-3 rounded-md border text-left flex items-center justify-between",
            disabled ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "bg-white",
            !disabled && "focus:outline-none focus:ring-2 focus:ring-blue-500",
            className
          )}
          onClick={() => { if (!disabled) setOpen(true) }}
          aria-disabled={disabled}
        >
          <span className={cn("truncate", !value && "text-gray-500")}>
            {value ? format(value, "dd-MM-yyyy") : placeholder}
          </span>
          <span className="flex items-center gap-2">
            {value && !disabled && (
              <X
                className="h-4 w-4 text-gray-400 hover:text-gray-600"
                onMouseDown={(e) => { e.preventDefault() }}
                onClick={(e) => { e.stopPropagation(); onChange?.(undefined) }}
                title="Clear"
              />
            )}
            <CalendarIcon className="h-4 w-4 text-gray-400" />
          </span>
        </button>
      </PopoverTrigger>
      {!disabled && (
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarComponent mode="single" selected={value} onSelect={(d) => { onChange?.(d); setOpen(false) }} initialFocus />
        </PopoverContent>
      )}
    </Popover>
  )
}