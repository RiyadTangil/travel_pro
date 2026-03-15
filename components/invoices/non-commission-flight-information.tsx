"use client"

import { useState, useCallback, useEffect, memo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Plane, Plus, X } from "lucide-react"
import { DateInput } from "@/components/ui/date-input"
import { TimeInput } from "@/components/ui/time-input"
import AirportSelect from "./airport-select"
import AirlineSelect from "./airline-select"
import { cn } from "@/lib/utils"

export interface FlightEntry {
  id: string
  from: string
  to: string
  airline: string
  flightNo: string
  flyDate?: Date
  departureTime: string
  arrivalTime: string
}

interface NonCommissionFlightInformationProps {
  initialEntries?: FlightEntry[]
  onChange: (entries: FlightEntry[]) => void
  errors: Record<string, string>
  airlineOptions?: string[]
  airportList?: any[]
}

const FlightRow = memo(function FlightRow({ 
  entry, 
  index, 
  isLast, 
  onUpdate, 
  onRemove, 
  onAdd,
  errors,
  airlineOptions,
  airportList
}: { 
  entry: FlightEntry
  index: number
  isLast: boolean
  onUpdate: (id: string, field: keyof FlightEntry, value: any) => void
  onRemove: (id: string) => void
  onAdd: () => void
  errors: Record<string, string>
  airlineOptions?: string[]
  airportList?: any[]
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-1">
          <Label className="text-[11px] font-bold text-gray-500"><span className="text-red-500">*</span> From:</Label>
          <AirportSelect 
            value={entry.from}
            onChange={v => {
              onUpdate(entry.id, 'from', v)
              if (v) errors[`flight[${index}].from`] = ""
            }}
            placeholder="Select" 
            preloaded={airportList}
            className={cn("h-8 text-xs", errors[`flight[${index}].from`] && "border-red-500")} 
          />
          {errors[`flight[${index}].from`] && <p className="text-[10px] text-red-500 mt-0.5">{errors[`flight[${index}].from`]}</p>}
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] font-bold text-gray-500"><span className="text-red-500">*</span> To:</Label>
          <AirportSelect 
            value={entry.to}
            onChange={v => {
              onUpdate(entry.id, 'to', v)
              if (v) errors[`flight[${index}].to`] = ""
            }}
            placeholder="Select" 
            preloaded={airportList}
            className={cn("h-8 text-xs", errors[`flight[${index}].to`] && "border-red-500")} 
          />
          {errors[`flight[${index}].to`] && <p className="text-[10px] text-red-500 mt-0.5">{errors[`flight[${index}].to`]}</p>}
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] font-bold text-gray-500"><span className="text-red-500">*</span> Airline:</Label>
          <AirlineSelect 
            value={entry.airline}
            onChange={v => {
              onUpdate(entry.id, 'airline', v)
              if (v) errors[`flight[${index}].airline`] = ""
            }}
            placeholder="Select" 
            options={airlineOptions}
            className={cn("h-8 text-xs", errors[`flight[${index}].airline`] && "border-red-500")} 
          />
          {errors[`flight[${index}].airline`] && <p className="text-[10px] text-red-500 mt-0.5">{errors[`flight[${index}].airline`]}</p>}
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] font-bold text-gray-500"><span className="text-red-500">*</span> Flight No:</Label>
          <Input 
            value={entry.flightNo}
            onChange={e => {
              onUpdate(entry.id, 'flightNo', e.target.value)
              if (e.target.value) errors[`flight[${index}].flightNo`] = ""
            }}
            placeholder="Flight No" 
            className={cn("h-8 text-xs", errors[`flight[${index}].flightNo`] && "border-red-500")} 
          />
          {errors[`flight[${index}].flightNo`] && <p className="text-[10px] text-red-500 mt-0.5">{errors[`flight[${index}].flightNo`]}</p>}
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] font-bold text-gray-500"><span className="text-red-500">*</span> Fly Date:</Label>
          <DateInput 
            value={entry.flyDate}
            onChange={d => {
              onUpdate(entry.id, 'flyDate', d)
              if (d) errors[`flight[${index}].flyDate`] = ""
            }}
            placeholder="Select date" 
            className={cn("h-8 text-xs", errors[`flight[${index}].flyDate`] && "border-red-500")} 
          />
          {errors[`flight[${index}].flyDate`] && <p className="text-[10px] text-red-500 mt-0.5">{errors[`flight[${index}].flyDate`]}</p>}
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] font-bold text-gray-500">Departure Time:</Label>
          <TimeInput 
            value={entry.departureTime}
            onChange={t => onUpdate(entry.id, 'departureTime', t || "")}
            className="h-8 text-xs" 
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] font-bold text-gray-500">Arrival Time:</Label>
          <div className="flex gap-2">
            <TimeInput 
              value={entry.arrivalTime}
              onChange={t => onUpdate(entry.id, 'arrivalTime', t || "")}
              className="h-8 text-xs flex-1" 
            />
            <Button 
              size="icon" 
              variant="destructive" 
              className="h-8 w-8 shrink-0 bg-red-500 hover:bg-red-600"
              onClick={() => onRemove(entry.id)}
            >
              <X className="h-4 w-4" />
            </Button>
            {isLast && (
              <Button 
                size="icon" 
                className="h-8 w-8 shrink-0 bg-sky-400 hover:bg-sky-500"
                onClick={onAdd}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})

export const NonCommissionFlightInformation = memo(function NonCommissionFlightInformation({ 
  initialEntries, 
  onChange,
  errors,
  airlineOptions,
  airportList
}: NonCommissionFlightInformationProps) {
  const [flightEntries, setFlightEntries] = useState<FlightEntry[]>(
    initialEntries && initialEntries.length > 0 
      ? initialEntries 
      : [{ id: "1", from: "", to: "", airline: "", flightNo: "", departureTime: "", arrivalTime: "" }]
  )

  const addFlightEntry = useCallback(() => {
    setFlightEntries(prev => [...prev, { 
      id: Date.now().toString(), 
      from: "", to: "", airline: "", flightNo: "", departureTime: "", arrivalTime: "" 
    }])
  }, [])

  const removeFlightEntry = useCallback((id: string) => {
    setFlightEntries(prev => prev.length > 1 ? prev.filter(f => f.id !== id) : prev)
  }, [])

  const updateFlightEntry = useCallback((id: string, field: keyof FlightEntry, value: any) => {
    setFlightEntries(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f))
  }, [])

  useEffect(() => {
    const handle = setTimeout(() => { onChange(flightEntries) }, 150)
    return () => clearTimeout(handle)
  }, [flightEntries, onChange])

  return (
    <Card className="border-none shadow-sm rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-100/80 flex items-center gap-2 border-b">
        <Plane className="h-4 w-4 text-blue-400" />
        <span className="text-sm font-bold text-gray-700 uppercase tracking-tight">Flight Details (Optional)</span>
      </div>
      <CardContent className="p-5 space-y-6">
        {flightEntries.map((entry, idx) => (
          <div key={entry.id} className="space-y-4">
            <FlightRow 
              entry={entry} 
              index={idx} 
              isLast={idx === flightEntries.length - 1}
              onUpdate={updateFlightEntry}
              onRemove={removeFlightEntry}
              onAdd={addFlightEntry}
              errors={errors}
              airlineOptions={airlineOptions}
              airportList={airportList}
            />
            {idx < flightEntries.length - 1 && <Separator className="bg-gray-100" />}
          </div>
        ))}
      </CardContent>
    </Card>
  )
})
