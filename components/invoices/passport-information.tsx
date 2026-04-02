"use client"

import { useEffect, useState, useCallback, useMemo, memo } from "react"
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

type PreloadedPassportItem = {
  id: string
  passportNo: string
  name?: string
  paxType?: string
  mobile?: string
  email?: string
  dob?: string
  dateOfIssue?: string
  dateOfExpire?: string
}

interface PassportInformationProps {
  initialEntries?: PassportEntry[]
  onChange?: (entries: PassportEntry[]) => void
  passportsPreloaded?: PreloadedPassportItem[]
  errors?: Record<string, string>
}

export function PassportInformation({ initialEntries, onChange, passportsPreloaded, errors }: PassportInformationProps) {
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
  const [passportEntries, setPassportEntries] = useState<PassportEntry[]>([
    { id: "1", ...initialPassportEntry }
  ])
  const [openAddPassport, setOpenAddPassport] = useState(false)
  const addPassportEntry = useCallback(() => {
    const newEntry: PassportEntry = {
      id: Date.now().toString(),
      ...initialPassportEntry
    }
    setPassportEntries(prev => [...prev, newEntry])
  }, [])

  const removePassportEntry = useCallback((id: string) => {
    setPassportEntries(prev => (prev.length > 1 ? prev.filter(entry => entry.id !== id) : prev))
  }, [])

  const updatePassportEntry = useCallback((id: string, field: keyof Omit<PassportEntry, 'id'>, value: string) => {
    setPassportEntries(prev => prev.map(entry => entry.id === id ? { ...entry, [field]: value } : entry))
  }, [])

  const updatePassportMultiple = useCallback((id: string, updates: Partial<PassportEntry>) => {
    setPassportEntries(prev => prev.map(entry => entry.id === id ? { ...entry, ...updates } : entry))
  }, [])

  useEffect(() => {
    if (initialEntries && initialEntries.length) {
      const normalized = initialEntries.map((e, idx) => {
        const fallback = passportsPreloaded?.find((p) => p.passportNo === e.passportNo)
        const passportId = e.passportId || fallback?.id || ""
        return { id: e.id || String(Date.now() + idx), ...e, passportId }
      })
      setPassportEntries(normalized)
    }
  }, [initialEntries, passportsPreloaded])

  // Debounce parent updates to avoid heavy synchronous re-rendering
  useEffect(() => {
    const handle = setTimeout(() => { onChange?.(passportEntries) }, 120)
    return () => clearTimeout(handle)
  }, [passportEntries, onChange])

  const passportsPreloadedMemo = useMemo(() => passportsPreloaded || [], [passportsPreloaded])

  const PassportRow = memo(function PassportRow({ entry, index }: { entry: PassportEntry; index: number }) {
    return (
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
                preloaded={passportsPreloadedMemo}
                onChange={async (id, selected) => {
                  if (!id) {
                    updatePassportMultiple(entry.id, {
                      passportId: undefined,
                      passportNo: '',
                      name: '',
                      paxType: '',
                      contactNo: '',
                      email: '',
                      dateOfBirth: '',
                      dateOfIssue: '',
                      dateOfExpire: ''
                    })
                    return
                  }
                  
                  if (selected) {
                    updatePassportMultiple(entry.id, {
                      passportId: id,
                      passportNo: selected.passportNo || '',
                      name: selected.name || entry.name,
                      paxType: selected.paxType || entry.paxType,
                      contactNo: selected.mobile || entry.contactNo,
                      email: selected.email || entry.email,
                      dateOfBirth: selected.dob || entry.dateOfBirth,
                      dateOfIssue: selected.dateOfIssue || entry.dateOfIssue,
                      dateOfExpire: selected.dateOfExpire || entry.dateOfExpire
                    })
                    return
                  }

                  // Fallback: fetch full details
                  try {
                    const res = await fetch(`/api/passports/${id}`)
                    if (res.ok) {
                      const data = await res.json()
                      const pass = data.passport
                      if (pass) {
                        updatePassportMultiple(entry.id, {
                          passportId: id,
                          passportNo: pass.passportNo || '',
                          name: pass.name || entry.name,
                          paxType: pass.paxType || entry.paxType,
                          contactNo: pass.mobile || entry.contactNo,
                          email: pass.email || entry.email,
                          dateOfBirth: pass.dob || entry.dateOfBirth,
                          dateOfIssue: pass.dateOfIssue || entry.dateOfIssue,
                          dateOfExpire: pass.dateOfExpire || entry.dateOfExpire
                        })
                      }
                    }
                  } catch (e) { /* ignore */ }
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
                value={entry.dateOfBirth ? parseYmdLocal(entry.dateOfBirth) : undefined}
                onChange={(d) => updatePassportEntry(entry.id, 'dateOfBirth', d ? toYmd(d) : "")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`dateOfIssue-${entry.id}`}>Date of Issue</Label>
              <DateInput
                value={entry.dateOfIssue ? parseYmdLocal(entry.dateOfIssue) : undefined}
                onChange={(d) => updatePassportEntry(entry.id, 'dateOfIssue', d ? toYmd(d) : "")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`dateOfExpire-${entry.id}`}>Date of Expire</Label>
              <DateInput
                value={entry.dateOfExpire ? parseYmdLocal(entry.dateOfExpire) : undefined}
                onChange={(d) => updatePassportEntry(entry.id, 'dateOfExpire', d ? toYmd(d) : "")}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Passport Information</h3>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={addPassportEntry}
          className="text-blue-600 border-blue-600 hover:bg-blue-50 h-8 w-8"
          title="Add Passport"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {passportEntries.map((entry, index) => (
        <PassportRow key={entry.id} entry={entry} index={index} />
      ))}

      <PassportModal
        open={openAddPassport}
        onClose={() => setOpenAddPassport(false)}
        onSubmit={async (payload) => {
          try {
            const res = await fetch('/api/passports', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.message || 'Failed to create passport')
            
            const createdPassport = data.passport
            if (createdPassport?.id) {
              setPassportEntries(prev => {
                // Find the first empty entry or one without passportId
                const emptyIndex = prev.findIndex(p => !p.passportId)
                if (emptyIndex !== -1) {
                  return prev.map((p, i) => i === emptyIndex ? {
                    ...p,
                    passportId: createdPassport.id,
                    passportNo: createdPassport.passportNo,
                    name: createdPassport.name || p.name,
                    paxType: createdPassport.paxType || p.paxType,
                    contactNo: createdPassport.mobile || p.contactNo,
                    email: createdPassport.email || p.email,
                    dateOfBirth: createdPassport.dob || p.dateOfBirth,
                    dateOfIssue: createdPassport.dateOfIssue || p.dateOfIssue,
                    dateOfExpire: createdPassport.dateOfExpire || p.dateOfExpire
                  } : p)
                }
                // If no empty entry, add a new one
                return [...prev, {
                  id: Date.now().toString(),
                  passportId: createdPassport.id,
                  passportNo: createdPassport.passportNo,
                  name: createdPassport.name || "",
                  paxType: createdPassport.paxType || "",
                  contactNo: createdPassport.mobile || "",
                  email: createdPassport.email || "",
                  dateOfBirth: createdPassport.dob || "",
                  dateOfIssue: createdPassport.dateOfIssue || "",
                  dateOfExpire: createdPassport.dateOfExpire || ""
                }]
              })
            }
            setOpenAddPassport(false)
          } catch (error: any) {
            console.error("Failed to add passport:", error)
          }
        }}
      />
    </div>
  )
}
