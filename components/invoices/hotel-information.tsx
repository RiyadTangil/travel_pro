"use client"

import { useEffect, useState, useCallback, memo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2 } from "lucide-react"
import { CustomDropdown } from "./custom-dropdown"
import { DateInput } from "@/components/ui/date-input"
import { parseYmdLocal, toYmd } from "./add-invoice-modal"

interface HotelEntry {
  id: string
  hotelName: string
  referenceNo: string
  checkInDate: string
  checkOutDate: string
  roomType: string
}

const initialHotelEntry: Omit<HotelEntry, 'id'> = {
  hotelName: "",
  referenceNo: "",
  checkInDate: "",
  checkOutDate: "",
  roomType: "",
}

const roomTypeOptions = [
  "Standard Room", "Deluxe Room", "Executive Room", "Suite", "Presidential Suite",
  "Twin Room", "Double Room", "Family Room", "Connecting Rooms"
]

interface HotelInformationProps {
  initialEntries?: HotelEntry[]
  onChange?: (entries: HotelEntry[]) => void
}

export function HotelInformation({ initialEntries, onChange }: HotelInformationProps) {

  const [hotelEntries, setHotelEntries] = useState<HotelEntry[]>([
    { id: "1", ...initialHotelEntry }
  ])

  useEffect(() => {
    if (initialEntries && initialEntries.length) {
      const normalized = initialEntries.map((e, idx) => ({ id: e.id || String(Date.now() + idx), ...e }))
      setHotelEntries(normalized)
    }
  }, [initialEntries])

  // Debounce parent updates
  useEffect(() => {
    const handle = setTimeout(() => { onChange?.(hotelEntries) }, 120)
    return () => clearTimeout(handle)
  }, [hotelEntries, onChange])

  const addHotelEntry = useCallback(() => {
    const newEntry: HotelEntry = {
      id: Date.now().toString(),
      ...initialHotelEntry
    }
    setHotelEntries(prev => [...prev, newEntry])
  }, [])

  const removeHotelEntry = useCallback((id: string) => {
    setHotelEntries(prev => (prev.length > 1 ? prev.filter(entry => entry.id !== id) : prev))
  }, [])

  const updateHotelEntry = useCallback((id: string, field: keyof Omit<HotelEntry, 'id'>, value: string) => {
    setHotelEntries(prev => prev.map(entry => entry.id === id ? { ...entry, [field]: value } : entry))
  }, [])
  // Row component moved to top-level below to keep a stable identity

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Hotel Information</h3>
      </div>

      {hotelEntries.map((entry, index) => (
        <MemoHotelRow
          key={entry.id}
          entry={entry}
          index={index}
          entriesLength={hotelEntries.length}
          onRemove={removeHotelEntry}
          onUpdate={updateHotelEntry}
        />
      ))}

      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addHotelEntry}
          className="text-blue-600 border-blue-600 hover:bg-blue-50"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Hotel
        </Button>
      </div>
    </div>
  )
}

interface HotelRowProps {
  entry: HotelEntry
  index: number
  entriesLength: number
  onRemove: (id: string) => void
  onUpdate: (id: string, field: keyof Omit<HotelEntry, 'id'>, value: string) => void
}

function HotelRowBase({ entry, index, entriesLength, onRemove, onUpdate }: HotelRowProps) {
  return (
    <Card key={entry.id} className="relative">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Hotel {index + 1}</CardTitle>
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
            <Label htmlFor={`hotelName-${entry.id}`}>Hotel Name</Label>
            <Input
              id={`hotelName-${entry.id}`}
              placeholder="Enter hotel name"
              value={entry.hotelName}
              onChange={(e) => onUpdate(entry.id, 'hotelName', e.target.value)}
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
            <Label htmlFor={`checkInDate-${entry.id}`}>Check-in Date</Label>
            <DateInput
              value={entry.checkInDate ? parseYmdLocal(entry.checkInDate) : undefined}
              onChange={(d) => onUpdate(entry.id, 'checkInDate', d ? toYmd(d) : "")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`checkOutDate-${entry.id}`}>Check-out Date</Label>
            <DateInput
              value={entry.checkOutDate ? parseYmdLocal(entry.checkOutDate) : undefined}
              onChange={(d) => onUpdate(entry.id, 'checkOutDate', d ? toYmd(d) : "")}
            />
          </div>

          <div className="space-y-2">
            <Label>Room Type</Label>
            <CustomDropdown
              placeholder="Select room type"
              options={roomTypeOptions}
              value={entry.roomType}
              onValueChange={(value) => onUpdate(entry.id, 'roomType', value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const MemoHotelRow = memo(HotelRowBase)
