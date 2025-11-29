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
}

export function PassportInformation({ initialEntries, onChange, passportsPreloaded }: PassportInformationProps) {
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
  useEffect(() => {
    if (initialEntries && initialEntries.length) {
      const normalized = initialEntries.map((e, idx) => ({ id: e.id || String(Date.now() + idx), ...e }))
      setPassportEntries(normalized)
    }
  }, [initialEntries])

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
                    updatePassportEntry(entry.id, 'passportId' as any, undefined as any)
                    updatePassportEntry(entry.id, 'passportNo', '')
                    updatePassportEntry(entry.id, 'name', '')
                    updatePassportEntry(entry.id, 'paxType', '')
                    updatePassportEntry(entry.id, 'contactNo', '')
                    updatePassportEntry(entry.id, 'email', '')
                    updatePassportEntry(entry.id, 'dateOfBirth', '')
                    updatePassportEntry(entry.id, 'dateOfIssue', '')
                    updatePassportEntry(entry.id, 'dateOfExpire', '')
                    return
                  }
                  // Set from selected if available to avoid network
                  updatePassportEntry(entry.id, 'passportId' as any, id)
                  updatePassportEntry(entry.id, 'passportNo', selected?.passportNo || '')
                  if (selected) {
                    if (selected.name) updatePassportEntry(entry.id, 'name', selected.name)
                    if (selected.paxType) updatePassportEntry(entry.id, 'paxType', selected.paxType)
                    if (selected.mobile) updatePassportEntry(entry.id, 'contactNo', selected.mobile)
                    if (selected.email) updatePassportEntry(entry.id, 'email', selected.email)
                    if (selected.dob) updatePassportEntry(entry.id, 'dateOfBirth', selected.dob)
                    if (selected.dateOfIssue) updatePassportEntry(entry.id, 'dateOfIssue', selected.dateOfIssue)
                    if (selected.dateOfExpire) updatePassportEntry(entry.id, 'dateOfExpire', selected.dateOfExpire)
                    return
                  }
                  // Fallback: fetch full details
                  try {
                    const res = await fetch(`/api/passports/${id}`)
                    if (res.ok) {
                      const data = await res.json()
                      const pass = data.passport
                      if (pass) {
                        updatePassportEntry(entry.id, 'name', pass.name || entry.name)
                        updatePassportEntry(entry.id, 'paxType', pass.paxType || entry.paxType)
                        updatePassportEntry(entry.id, 'contactNo', pass.mobile || entry.contactNo)
                        updatePassportEntry(entry.id, 'email', pass.email || entry.email)
                        updatePassportEntry(entry.id, 'dateOfBirth', pass.dob || entry.dateOfBirth)
                        updatePassportEntry(entry.id, 'dateOfIssue', pass.dateOfIssue || entry.dateOfIssue)
                        updatePassportEntry(entry.id, 'dateOfExpire', pass.dateOfExpire || entry.dateOfExpire)
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
                disabled={true}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`dateOfIssue-${entry.id}`}>Date of Issue</Label>
              <DateInput
                value={entry.dateOfIssue ? parseYmdLocal(entry.dateOfIssue) : undefined}
                onChange={(d) => updatePassportEntry(entry.id, 'dateOfIssue', d ? toYmd(d) : "")}
                disabled={true}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`dateOfExpire-${entry.id}`}>Date of Expire</Label>
              <DateInput
                value={entry.dateOfExpire ? parseYmdLocal(entry.dateOfExpire) : undefined}
                onChange={(d) => updatePassportEntry(entry.id, 'dateOfExpire', d ? toYmd(d) : "")}
                disabled={true}
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
      </div>

      {passportEntries.map((entry, index) => (
        <PassportRow key={entry.id} entry={entry} index={index} />
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
