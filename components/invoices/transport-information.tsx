"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2 } from "lucide-react"
import { CustomDropdown } from "./custom-dropdown"

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

const transportTypeOptions = [
  "Airport Transfer", "City Transfer", "Intercity Transfer", "Tour Transport", "Private Hire"
]

export function TransportInformation() {
  const [transportEntries, setTransportEntries] = useState<TransportEntry[]>([
    { id: "1", ...initialTransportEntry }
  ])

  const addTransportEntry = () => {
    const newEntry: TransportEntry = {
      id: Date.now().toString(),
      ...initialTransportEntry
    }
    setTransportEntries([...transportEntries, newEntry])
  }

  const removeTransportEntry = (id: string) => {
    if (transportEntries.length > 1) {
      setTransportEntries(transportEntries.filter(entry => entry.id !== id))
    }
  }

  const updateTransportEntry = (id: string, field: keyof Omit<TransportEntry, 'id'>, value: string) => {
    setTransportEntries(transportEntries.map(entry => 
      entry.id === id ? { ...entry, [field]: value } : entry
    ))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Transport Information</h3>
      </div>

      {transportEntries.map((entry, index) => (
        <Card key={entry.id} className="relative">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Transport {index + 1}</CardTitle>
              {transportEntries.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeTransportEntry(entry.id)}
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
                <Label>Transport Type</Label>
                <CustomDropdown
                  placeholder="Select transport type"
                  options={transportTypeOptions}
                  value={entry.transportType}
                  onValueChange={(value) => updateTransportEntry(entry.id, 'transportType', value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`referenceNo-${entry.id}`}>Reference No</Label>
                <Input
                  id={`referenceNo-${entry.id}`}
                  placeholder="Enter reference no"
                  value={entry.referenceNo}
                  onChange={(e) => updateTransportEntry(entry.id, 'referenceNo', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`pickupPlace-${entry.id}`}>Pickup Place</Label>
                <Input
                  id={`pickupPlace-${entry.id}`}
                  placeholder="Enter pickup place"
                  value={entry.pickupPlace}
                  onChange={(e) => updateTransportEntry(entry.id, 'pickupPlace', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`pickupTime-${entry.id}`}>Pickup Time</Label>
                <Input
                  id={`pickupTime-${entry.id}`}
                  type="time"
                  value={entry.pickupTime}
                  onChange={(e) => updateTransportEntry(entry.id, 'pickupTime', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`dropOffPlace-${entry.id}`}>Drop Off Place</Label>
                <Input
                  id={`dropOffPlace-${entry.id}`}
                  placeholder="Enter drop off place"
                  value={entry.dropOffPlace}
                  onChange={(e) => updateTransportEntry(entry.id, 'dropOffPlace', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`dropoffTime-${entry.id}`}>Dropoff Time</Label>
                <Input
                  id={`dropoffTime-${entry.id}`}
                  type="time"
                  value={entry.dropoffTime}
                  onChange={(e) => updateTransportEntry(entry.id, 'dropoffTime', e.target.value)}
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