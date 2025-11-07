"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2 } from "lucide-react"
import { CustomDropdown } from "./custom-dropdown"

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

export function HotelInformation() {
  const [hotelEntries, setHotelEntries] = useState<HotelEntry[]>([
    { id: "1", ...initialHotelEntry }
  ])

  const addHotelEntry = () => {
    const newEntry: HotelEntry = {
      id: Date.now().toString(),
      ...initialHotelEntry
    }
    setHotelEntries([...hotelEntries, newEntry])
  }

  const removeHotelEntry = (id: string) => {
    if (hotelEntries.length > 1) {
      setHotelEntries(hotelEntries.filter(entry => entry.id !== id))
    }
  }

  const updateHotelEntry = (id: string, field: keyof Omit<HotelEntry, 'id'>, value: string) => {
    setHotelEntries(hotelEntries.map(entry => 
      entry.id === id ? { ...entry, [field]: value } : entry
    ))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Hotel Information</h3>
      </div>

      {hotelEntries.map((entry, index) => (
        <Card key={entry.id} className="relative">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Hotel {index + 1}</CardTitle>
              {hotelEntries.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeHotelEntry(entry.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`hotelName-${entry.id}`}>Hotel Name</Label>
                <Input
                  id={`hotelName-${entry.id}`}
                  placeholder="Enter hotel name"
                  value={entry.hotelName}
                  onChange={(e) => updateHotelEntry(entry.id, 'hotelName', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`referenceNo-${entry.id}`}>Reference No</Label>
                <Input
                  id={`referenceNo-${entry.id}`}
                  placeholder="Enter reference no"
                  value={entry.referenceNo}
                  onChange={(e) => updateHotelEntry(entry.id, 'referenceNo', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`checkInDate-${entry.id}`}>Check-in Date</Label>
                <Input
                  id={`checkInDate-${entry.id}`}
                  type="date"
                  value={entry.checkInDate}
                  onChange={(e) => updateHotelEntry(entry.id, 'checkInDate', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`checkOutDate-${entry.id}`}>Check-out Date</Label>
                <Input
                  id={`checkOutDate-${entry.id}`}
                  type="date"
                  value={entry.checkOutDate}
                  onChange={(e) => updateHotelEntry(entry.id, 'checkOutDate', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Room Type</Label>
                <CustomDropdown
                  placeholder="Select room type"
                  options={roomTypeOptions}
                  value={entry.roomType}
                  onValueChange={(value) => updateHotelEntry(entry.id, 'roomType', value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
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