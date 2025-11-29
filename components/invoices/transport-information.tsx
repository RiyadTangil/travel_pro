"use client"

import { useEffect, useMemo, useState, useCallback, memo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2 } from "lucide-react"
import { CustomDropdown } from "./custom-dropdown"
import { TimeInput } from "@/components/ui/time-input"
import { useTransportTypes } from "@/hooks/useTransportTypes"

interface TransportEntry {
  id: string
  transportType: string
  referenceNo: string
  pickupPlace: string
  pickupTime: string
  dropOffPlace: string
  dropoffTime: string
}

const initialTransportEntry: Omit<TransportEntry, 'id'> = {
  transportType: "",
  referenceNo: "",
  pickupPlace: "",
  pickupTime: "",
  dropOffPlace: "",
  dropoffTime: "",
}

// Transport types are now sourced from API via hook

interface TransportInformationProps {
  initialEntries?: TransportEntry[]
  onChange?: (entries: TransportEntry[]) => void
  transportTypeNamesExternal?: string[]
}

export function TransportInformation({ initialEntries, onChange, transportTypeNamesExternal }: TransportInformationProps) {
  const { items: transportTypes } = useTransportTypes(true, !!transportTypeNamesExternal)
  const [transportEntries, setTransportEntries] = useState<TransportEntry[]>([
    { id: "1", ...initialTransportEntry }
  ])

  const addTransportEntry = useCallback(() => {
    const newEntry: TransportEntry = {
      id: Date.now().toString(),
      ...initialTransportEntry
    }
    setTransportEntries(prev => [...prev, newEntry])
  }, [])

  const removeTransportEntry = useCallback((id: string) => {
    setTransportEntries(prev => (prev.length > 1 ? prev.filter(entry => entry.id !== id) : prev))
  }, [])

  const updateTransportEntry = useCallback((id: string, field: keyof Omit<TransportEntry, 'id'>, value: string) => {
    setTransportEntries(prev => prev.map(entry => entry.id === id ? { ...entry, [field]: value } : entry))
  }, [])
  useEffect(() => {
    if (initialEntries && initialEntries.length) {
      const normalized = initialEntries.map((e, idx) => ({ id: e.id || String(Date.now() + idx), ...e }))
      setTransportEntries(normalized)
    }
  }, [initialEntries])

  // Debounce parent updates
  useEffect(() => {
    const handle = setTimeout(() => { onChange?.(transportEntries) }, 120)
    return () => clearTimeout(handle)
  }, [transportEntries, onChange])

  const transportTypeOptions = useMemo(() => (
    transportTypeNamesExternal && transportTypeNamesExternal.length
      ? transportTypeNamesExternal
      : transportTypes.map(t => t.name)
  ), [transportTypes, transportTypeNamesExternal])

  // Row component moved to top-level below to keep a stable identity

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Transport Information</h3>
      </div>

      {transportEntries.map((entry, index) => (
        <MemoTransportRow
          key={entry.id}
          entry={entry}
          index={index}
          entriesLength={transportEntries.length}
          onRemove={removeTransportEntry}
          onUpdate={updateTransportEntry}
          transportTypeOptions={transportTypeOptions}
        />
      ))}

      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addTransportEntry}
          className="text-blue-600 border-blue-600 hover:bg-blue-50"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Transport
        </Button>
      </div>
    </div>
  )
}

interface TransportRowProps {
  entry: TransportEntry
  index: number
  entriesLength: number
  onRemove: (id: string) => void
  onUpdate: (id: string, field: keyof Omit<TransportEntry, 'id'>, value: string) => void
  transportTypeOptions: string[]
}

function TransportRowBase({ entry, index, entriesLength, onRemove, onUpdate, transportTypeOptions }: TransportRowProps) {
  return (
    <Card key={entry.id} className="relative">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Transport {index + 1}</CardTitle>
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
            <Label>Transport Type</Label>
            <CustomDropdown
              placeholder="Select transport type"
              options={transportTypeOptions}
              value={entry.transportType}
              onValueChange={(value) => onUpdate(entry.id, 'transportType', value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`referenceNo-${entry.id}`}>Reference No</Label>
            <Input
              id={`referenceNo-${entry.id}`}
              placeholder="Enter reference no"
              value={entry.referenceNo}
              onChange={(e) => onUpdate(entry.id, 'referenceNo', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`pickupPlace-${entry.id}`}>Pickup Place</Label>
            <Input
              id={`pickupPlace-${entry.id}`}
              placeholder="Enter pickup place"
              value={entry.pickupPlace}
              onChange={(e) => onUpdate(entry.id, 'pickupPlace', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`pickupTime-${entry.id}`}>Pickup Time</Label>
            <TimeInput
              value={entry.pickupTime}
              onChange={(t) => onUpdate(entry.id, 'pickupTime', t || "")}
              twelveHour={false}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`dropOffPlace-${entry.id}`}>Drop Off Place</Label>
            <Input
              id={`dropOffPlace-${entry.id}`}
              placeholder="Enter drop off place"
              value={entry.dropOffPlace}
              onChange={(e) => onUpdate(entry.id, 'dropOffPlace', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`dropoffTime-${entry.id}`}>Dropoff Time</Label>
            <TimeInput
              value={entry.dropoffTime}
              onChange={(t) => onUpdate(entry.id, 'dropoffTime', t || "")}
              twelveHour={true}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const MemoTransportRow = memo(TransportRowBase)
