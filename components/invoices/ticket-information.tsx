"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2 } from "lucide-react"
import { CustomDropdown } from "./custom-dropdown"

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

const airlineOptions = [
  "Emirates", "Qatar Airways", "Singapore Airlines", "Lufthansa", "British Airways",
  "Air France", "KLM", "Turkish Airlines", "Etihad Airways", "Cathay Pacific",
  "American Airlines", "Delta Air Lines", "United Airlines"
]

export function TicketInformation() {
  const [ticketEntries, setTicketEntries] = useState<TicketEntry[]>([
    { id: "1", ...initialTicketEntry }
  ])

  const addTicketEntry = () => {
    const newEntry: TicketEntry = {
      id: Date.now().toString(),
      ...initialTicketEntry
    }
    setTicketEntries([...ticketEntries, newEntry])
  }

  const removeTicketEntry = (id: string) => {
    if (ticketEntries.length > 1) {
      setTicketEntries(ticketEntries.filter(entry => entry.id !== id))
    }
  }

  const updateTicketEntry = (id: string, field: keyof Omit<TicketEntry, 'id'>, value: string) => {
    setTicketEntries(ticketEntries.map(entry => 
      entry.id === id ? { ...entry, [field]: value } : entry
    ))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Ticket Information</h3>
      </div>

      {ticketEntries.map((entry, index) => (
        <Card key={entry.id} className="relative">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Ticket {index + 1}</CardTitle>
              {ticketEntries.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeTicketEntry(entry.id)}
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
                <Label htmlFor={`ticketNo-${entry.id}`}>Ticket No</Label>
                <Input
                  id={`ticketNo-${entry.id}`}
                  placeholder="Enter ticket number"
                  value={entry.ticketNo}
                  onChange={(e) => updateTicketEntry(entry.id, 'ticketNo', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`pnr-${entry.id}`}>PNR</Label>
                <Input
                  id={`pnr-${entry.id}`}
                  placeholder="Enter PNR"
                  value={entry.pnr}
                  onChange={(e) => updateTicketEntry(entry.id, 'pnr', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`route-${entry.id}`}>Route</Label>
                <Input
                  id={`route-${entry.id}`}
                  placeholder="e.g., DAC → DXB"
                  value={entry.route}
                  onChange={(e) => updateTicketEntry(entry.id, 'route', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`referenceNo-${entry.id}`}>Reference No</Label>
                <Input
                  id={`referenceNo-${entry.id}`}
                  placeholder="Enter reference number"
                  value={entry.referenceNo}
                  onChange={(e) => updateTicketEntry(entry.id, 'referenceNo', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`journeyDate-${entry.id}`}>Journey Date</Label>
                <Input
                  id={`journeyDate-${entry.id}`}
                  type="date"
                  value={entry.journeyDate}
                  onChange={(e) => updateTicketEntry(entry.id, 'journeyDate', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`returnDate-${entry.id}`}>Return Date</Label>
                <Input
                  id={`returnDate-${entry.id}`}
                  type="date"
                  value={entry.returnDate}
                  onChange={(e) => updateTicketEntry(entry.id, 'returnDate', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Airline</Label>
                <CustomDropdown
                  placeholder="Select airline"
                  options={airlineOptions}
                  value={entry.airline}
                  onValueChange={(value) => updateTicketEntry(entry.id, 'airline', value)}
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