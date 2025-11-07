"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2 } from "lucide-react"
import { CustomDropdown } from "./custom-dropdown"

interface PassportEntry {
  id: string
  name: string
  passportNo: string
  paxType: string
  contactNo: string
  email: string
  dateOfBirth: string
  dateOfIssue: string
  dateOfExpire: string
}

const initialPassportEntry: Omit<PassportEntry, 'id'> = {
  name: "",
  passportNo: "",
  paxType: "",
  contactNo: "",
  email: "",
  dateOfBirth: "",
  dateOfIssue: "",
  dateOfExpire: "",
}

const paxTypeOptions = ["Adult", "Child", "Infant"]

export function PassportInformation() {
  const [passportEntries, setPassportEntries] = useState<PassportEntry[]>([
    { id: "1", ...initialPassportEntry }
  ])

  const addPassportEntry = () => {
    const newEntry: PassportEntry = {
      id: Date.now().toString(),
      ...initialPassportEntry
    }
    setPassportEntries([...passportEntries, newEntry])
  }

  const removePassportEntry = (id: string) => {
    if (passportEntries.length > 1) {
      setPassportEntries(passportEntries.filter(entry => entry.id !== id))
    }
  }

  const updatePassportEntry = (id: string, field: keyof Omit<PassportEntry, 'id'>, value: string) => {
    setPassportEntries(passportEntries.map(entry => 
      entry.id === id ? { ...entry, [field]: value } : entry
    ))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Passport Information</h3>
      </div>

      {passportEntries.map((entry, index) => (
        <Card key={entry.id} className="relative">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Passport {index + 1}</CardTitle>
              {passportEntries.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removePassportEntry(entry.id)}
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
                <Label htmlFor={`passportNo-${entry.id}`}>Passport No</Label>
                <Input
                  id={`passportNo-${entry.id}`}
                  placeholder="Enter passport number"
                  value={entry.passportNo}
                  onChange={(e) => updatePassportEntry(entry.id, 'passportNo', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`name-${entry.id}`}>Name</Label>
                <Input
                  id={`name-${entry.id}`}
                  placeholder="Enter full name"
                  value={entry.name}
                  onChange={(e) => updatePassportEntry(entry.id, 'name', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Pax Type</Label>
                <CustomDropdown
                  placeholder="Select pax type"
                  options={paxTypeOptions}
                  value={entry.paxType}
                  onValueChange={(value) => updatePassportEntry(entry.id, 'paxType', value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`contactNo-${entry.id}`}>Contact No</Label>
                <Input
                  id={`contactNo-${entry.id}`}
                  placeholder="Enter contact number"
                  value={entry.contactNo}
                  onChange={(e) => updatePassportEntry(entry.id, 'contactNo', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`email-${entry.id}`}>Email</Label>
                <Input
                  id={`email-${entry.id}`}
                  type="email"
                  placeholder="Enter email"
                  value={entry.email}
                  onChange={(e) => updatePassportEntry(entry.id, 'email', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`dateOfBirth-${entry.id}`}>Date of Birth</Label>
                <Input
                  id={`dateOfBirth-${entry.id}`}
                  type="date"
                  value={entry.dateOfBirth}
                  onChange={(e) => updatePassportEntry(entry.id, 'dateOfBirth', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`dateOfIssue-${entry.id}`}>Date of Issue</Label>
                <Input
                  id={`dateOfIssue-${entry.id}`}
                  type="date"
                  value={entry.dateOfIssue}
                  onChange={(e) => updatePassportEntry(entry.id, 'dateOfIssue', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`dateOfExpire-${entry.id}`}>Date of Expire</Label>
                <Input
                  id={`dateOfExpire-${entry.id}`}
                  type="date"
                  value={entry.dateOfExpire}
                  onChange={(e) => updatePassportEntry(entry.id, 'dateOfExpire', e.target.value)}
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
          onClick={addPassportEntry}
          className="text-blue-600 border-blue-600 hover:bg-blue-50"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Passport
        </Button>
      </div>
    </div>
  )
}