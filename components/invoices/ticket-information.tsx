"use client"

import { useEffect, useState, useCallback, memo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2 } from "lucide-react"
import { CustomDropdown } from "./custom-dropdown"
import { DateInput } from "@/components/ui/date-input"
import AirportRouteSelect from "./airport-route-select"
import { parseYmdLocal, toYmd } from "./add-invoice-modal"

interface TicketEntry {
  id: string
  ticketNo: string
  pnr: string
  route: string
  referenceNo: string
  journeyDate: string
  returnDate: string
  airline: string
}

const initialTicketEntry: Omit<TicketEntry, 'id'> = {
  ticketNo: "",
  pnr: "",
  route: "",
  referenceNo: "",
  journeyDate: "",
  returnDate: "",
  airline: "",
}

interface TicketInformationProps {
  initialEntries?: TicketEntry[]
  onChange?: (entries: TicketEntry[]) => void
  airlineOptionsExternal?: string[]
  airportListExternal?: Array<{ code: string; name: string; country?: string }>
}

export function TicketInformation({ initialEntries, onChange, airlineOptionsExternal, airportListExternal }: TicketInformationProps) {
  const parseYmdLocal = (s?: string): Date | undefined => {
    if (!s) return undefined
    const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})/.exec(s)
    if (!m) return new Date(s)
    const y = Number(m[1]); const mo = Number(m[2]); const d = Number(m[3])
    if (!isFinite(y) || !isFinite(mo) || !isFinite(d)) return new Date(s)
    return new Date(y, mo - 1, d)
  }
  const toYmd = (d: Date): string => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const da = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${da}`
  }
  const [ticketEntries, setTicketEntries] = useState<TicketEntry[]>([
    { id: "1", ...initialTicketEntry }
  ])
  const [airlineOptions, setAirlineOptions] = useState<string[]>([])

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    const loadAirlines = async () => {
      try {
        if (airlineOptionsExternal && airlineOptionsExternal.length) {
          if (active) setAirlineOptions(airlineOptionsExternal)
        } else {
          const res = await fetch(`/api/airlines?limit=500`, { signal: controller.signal })
          const data = await res.json()
          const names: string[] = (data.items || []).map((a: any) => a.name)
          if (active) setAirlineOptions(names)
        }
      } catch (e) {
        if (active) setAirlineOptions([])
      }
    }
    loadAirlines()
    return () => { active = false; controller.abort() }
  }, [airlineOptionsExternal])

  useEffect(() => {
    if (initialEntries && initialEntries.length) {
      // normalize: ensure each has an id
      const normalized = initialEntries.map((e, idx) => ({ id: e.id || String(Date.now() + idx), ...e }))
      setTicketEntries(normalized)
    }
  }, [initialEntries])

  // Debounce parent updates
  useEffect(() => {
    const handle = setTimeout(() => { onChange?.(ticketEntries) }, 120)
    return () => clearTimeout(handle)
  }, [ticketEntries, onChange])

  const addTicketEntry = useCallback(() => {
    const newEntry: TicketEntry = {
      id: Date.now().toString(),
      ...initialTicketEntry
    }
    setTicketEntries(prev => [...prev, newEntry])
  }, [])

  const removeTicketEntry = useCallback((id: string) => {
    setTicketEntries(prev => (prev.length > 1 ? prev.filter(entry => entry.id !== id) : prev))
  }, [])

  const updateTicketEntry = useCallback((id: string, field: keyof Omit<TicketEntry, 'id'>, value: string) => {
    setTicketEntries(prev => prev.map(entry => entry.id === id ? { ...entry, [field]: value } : entry))
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Ticket Information</h3>
      </div>

      {ticketEntries.map((entry, index) => (
        <MemoTicketRow
          key={entry.id}
          entry={entry}
          index={index}
          entriesLength={ticketEntries.length}
          onRemove={removeTicketEntry}
          onUpdate={updateTicketEntry}
          airlineOptions={airlineOptions}
          airportListExternal={airportListExternal}
        />
      ))}

      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addTicketEntry}
          className="text-blue-600 border-blue-600 hover:bg-blue-50"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Ticket
        </Button>
      </div>
    </div>
  )
}

interface TicketRowProps {
  entry: TicketEntry
  index: number
  entriesLength: number
  onRemove: (id: string) => void
  onUpdate: (id: string, field: keyof Omit<TicketEntry, 'id'>, value: string) => void
  airlineOptions: string[]
  airportListExternal?: Array<{ code: string; name: string; country?: string }>
}

function TicketRowBase({ entry, index, entriesLength, onRemove, onUpdate, airlineOptions, airportListExternal }: TicketRowProps) {
  return (
    <Card key={entry.id} className="relative">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Ticket {index + 1}</CardTitle>
          {entriesLength > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onRemove(entry.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`ticketNo-${entry.id}`}>Ticket No</Label>
            <Input
              id={`ticketNo-${entry.id}`}
              placeholder="Enter ticket number"
              value={entry.ticketNo}
              onChange={(e) => onUpdate(entry.id, 'ticketNo', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`pnr-${entry.id}`}>PNR</Label>
            <Input
              id={`pnr-${entry.id}`}
              placeholder="Enter PNR"
              value={entry.pnr}
              onChange={(e) => onUpdate(entry.id, 'pnr', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`route-${entry.id}`}>Route</Label>
            <AirportRouteSelect
              value={entry.route}
              onChange={(next) => onUpdate(entry.id, 'route', next)}
              placeholder="PKX->CNS->"
              preloaded={airportListExternal}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`referenceNo-${entry.id}`}>Reference No</Label>
            <Input
              id={`referenceNo-${entry.id}`}
              placeholder="Enter reference number"
              value={entry.referenceNo}
              onChange={(e) => onUpdate(entry.id, 'referenceNo', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`journeyDate-${entry.id}`}>Journey Date</Label>
            <DateInput
              value={entry.journeyDate ? parseYmdLocal(entry.journeyDate) : undefined}
              onChange={(d) => onUpdate(entry.id, 'journeyDate', d ? toYmd(d) : "")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`returnDate-${entry.id}`}>Return Date</Label>
            <DateInput
              value={entry.returnDate ? parseYmdLocal(entry.returnDate) : undefined}
              onChange={(d) => onUpdate(entry.id, 'returnDate', d ? toYmd(d) : "")}
            />
          </div>

          <div className="space-y-2">
            <Label>Airline</Label>
            <CustomDropdown
              placeholder="Select airline"
              options={airlineOptions}
              value={entry.airline}
              onValueChange={(value) => onUpdate(entry.id, 'airline', value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const MemoTicketRow = memo(TicketRowBase)
