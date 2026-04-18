"use client"

import * as React from "react"
import { addDays, format, subDays, startOfDay, endOfDay, subMonths } from "date-fns"
import { Calendar as CalendarIcon, X } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateRangePickerProps {
  date?: DateRange
  onDateChange?: (date?: DateRange) => void
  className?: string
  placeholder?: string
}

export function DateRangePickerWithPresets({
  date,
  onDateChange,
  className,
  placeholder = "Start date -> End date",
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)

  // Presets
  const presets = [
    {
      label: "Today",
      getValue: () => {
        const today = new Date()
        return { from: startOfDay(today), to: endOfDay(today) }
      },
    },
    {
      label: "Yesterday",
      getValue: () => {
        const yesterday = subDays(new Date(), 1)
        return { from: startOfDay(yesterday), to: endOfDay(yesterday) }
      },
    },
    {
      label: "Last 7 Days",
      getValue: () => {
        const today = new Date()
        return { from: subDays(today, 7), to: endOfDay(today) }
      },
    },
    {
      label: "Last 14 Days",
      getValue: () => {
        const today = new Date()
        return { from: subDays(today, 14), to: endOfDay(today) }
      },
    },
    {
      label: "Last 30 Days",
      getValue: () => {
        const today = new Date()
        return { from: subDays(today, 30), to: endOfDay(today) }
      },
    },
    {
      label: "Last 90 Days",
      getValue: () => {
        const today = new Date()
        return { from: subDays(today, 90), to: endOfDay(today) }
      },
    },
  ]

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[260px] justify-between text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <div className="flex items-center">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, "LLL dd, y")} -{" "}
                    {format(date.to, "LLL dd, y")}
                  </>
                ) : (
                  format(date.from, "LLL dd, y")
                )
              ) : (
                <span>{placeholder}</span>
              )}
            </div>
            {date?.from && (
               <div 
                 role="button"
                 className="hover:bg-gray-200 p-1 rounded-full"
                 onClick={(e) => {
                   e.stopPropagation()
                   onDateChange?.(undefined)
                 }}
               >
                 <X className="h-4 w-4 text-gray-500" />
               </div>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="flex">
            <div className="flex flex-col gap-2 p-3 border-r">
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  className="justify-start font-normal text-sm h-8"
                  onClick={() => {
                    onDateChange?.(preset.getValue())
                    setOpen(false)
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <div className="p-0">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={onDateChange}
                numberOfMonths={2}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
