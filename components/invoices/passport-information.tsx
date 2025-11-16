"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2 } from "lucide-react"
import { CustomDropdown } from "./custom-dropdown"
import { DateInput } from "@/components/ui/date-input"
import PassportSelect from "@/components/passports/passport-select"
import { PassportModal } from "@/components/passports/passport-modal"

interface PassportEntry {
  id: string
  passportId?: string
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
  const [openAddPassport, setOpenAddPassport] = useState(false)

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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`passportNo-${entry.id}`}>Passport No</Label>
                <PassportSelect
                  value={entry.passportId}
                  onChange={async (id, selected) => {
                    if (!id) {
                      // Clear selection and unfill all autofilled fields
                      setPassportEntries(passportEntries.map(p => p.id === entry.id ? {
                        ...p,
                        passportId: undefined,
                        passportNo: "",
                        name: "",
                        paxType: "",
                        contactNo: "",
                        email: "",
                        dateOfBirth: "",
                        dateOfIssue: "",
                        dateOfExpire: "",
                      } : p))
                      return
                    }
                    // Set basic selected passportNo first
                    setPassportEntries(passportEntries.map(p => p.id === entry.id ? { ...p, passportId: id, passportNo: selected?.passportNo || "" } : p))
                    // Load full passport details to autofill
                    try {
                      const res = await fetch(`/api/passports/${id}`)
                      if (res.ok) {
                        const data = await res.json()
                        const pass = data.passport
                        if (pass) {
                          setPassportEntries(prev => prev.map(p => p.id === entry.id ? {
                            ...p,
                            name: pass.name || p.name,
                            paxType: pass.paxType || p.paxType,
                            contactNo: pass.mobile || p.contactNo,
                            email: pass.email || p.email,
                            dateOfBirth: pass.dob || p.dateOfBirth,
                            dateOfIssue: pass.dateOfIssue || p.dateOfIssue,
                            dateOfExpire: pass.dateOfExpire || p.dateOfExpire,
                          } : p))
                        }
                      }
                    } catch (e) {
                      // ignore
                    }
                  }}
                  onRequestAdd={() => setOpenAddPassport(true)}
                  placeholder="Select passport"
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
                <DateInput
                  value={entry.dateOfBirth ? new Date(entry.dateOfBirth) : undefined}
                  onChange={(d) => updatePassportEntry(entry.id, 'dateOfBirth', d ? d.toISOString().slice(0,10) : "")}
                  disabled={true}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`dateOfIssue-${entry.id}`}>Date of Issue</Label>
                <DateInput
                  value={entry.dateOfIssue ? new Date(entry.dateOfIssue) : undefined}
                  onChange={(d) => updatePassportEntry(entry.id, 'dateOfIssue', d ? d.toISOString().slice(0,10) : "")}
                  disabled={true}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`dateOfExpire-${entry.id}`}>Date of Expire</Label>
                <DateInput
                  value={entry.dateOfExpire ? new Date(entry.dateOfExpire) : undefined}
                  onChange={(d) => updatePassportEntry(entry.id, 'dateOfExpire', d ? d.toISOString().slice(0,10) : "")}
                  disabled={true}
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

      <PassportModal
        open={openAddPassport}
        onClose={() => setOpenAddPassport(false)}
        onSubmit={async (payload) => {
          // naive add: after adding passport, set into the first entry without id
          const createdId = payload.passportNo
          setPassportEntries(prev => prev.map(p => {
            if (!p.passportId) {
              return { ...p, passportId: createdId, passportNo: payload.passportNo, name: payload.name || p.name }
            }
            return p
          }))
          setOpenAddPassport(false)
        }}
      />
    </div>
  )
}