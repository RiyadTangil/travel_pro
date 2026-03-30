"use client"

import { useState, useCallback, useEffect, memo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { User, Plus, X } from "lucide-react"
import { DateInput } from "@/components/ui/date-input"
import PassportSelect from "@/components/passports/passport-select"
import { CustomDropdown } from "./custom-dropdown"
import { cn } from "@/lib/utils"

const paxTypeOptions = ["Adult", "Child", "Infant"]

export interface PaxEntry {
  id: string
  passportId: string
  name: string
  paxType: string
  contactNo: string
  email: string
  dob?: Date
  dateOfIssue?: Date
  dateOfExpire?: Date
}

interface NonCommissionPaxInformationProps {
  initialEntries?: PaxEntry[]
  onChange: (entries: PaxEntry[]) => void
  passportsPreloaded?: any[]
  errors: Record<string, string>
}

const PaxRow = memo(function PaxRow({ 
  entry, 
  index, 
  isLast, 
  onUpdate, 
  onUpdateMultiple,
  onRemove, 
  onAdd,
  passportsPreloaded,
  errors 
}: { 
  entry: PaxEntry
  index: number
  isLast: boolean
  onUpdate: (id: string, field: keyof PaxEntry, value: any) => void
  onUpdateMultiple: (id: string, updates: Partial<PaxEntry>) => void
  onRemove: (id: string) => void
  onAdd: () => void
  passportsPreloaded?: any[]
  errors: Record<string, string>
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="space-y-1">
          <Label className="text-[11px] font-bold text-gray-500">Passport No</Label>
          <PassportSelect 
            value={entry.passportId}
            preloaded={passportsPreloaded}
            onChange={(id, sel) => {
              if (sel) {
                const parseDate = (d?: string) => {
                  if (!d) return undefined;
                  const date = new Date(d);
                  return isNaN(date.getTime()) ? undefined : date;
                };

                onUpdateMultiple(entry.id, {
                  passportId: id || "",
                  name: sel.name || "",
                  contactNo: sel.mobile || "",
                  email: sel.email || "",
                  paxType: sel.paxType || "Adult",
                  dob: parseDate(sel.dob),
                  dateOfIssue: parseDate(sel.dateOfIssue),
                  dateOfExpire: parseDate(sel.dateOfExpire)
                });
              } else {
                // Clear fields on deselect
                onUpdateMultiple(entry.id, {
                  passportId: "",
                  name: "",
                  contactNo: "",
                  email: "",
                  paxType: "",
                  dob: undefined,
                  dateOfIssue: undefined,
                  dateOfExpire: undefined
                });
              }
            }}
            placeholder="Select Passport" 
            className="h-8 text-xs" 
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] font-bold text-gray-500">Name <span className="text-red-500">*</span></Label>
          <Input 
            value={entry.name}
            onChange={e => {
              onUpdate(entry.id, 'name', e.target.value)
              if (e.target.value) errors[`pax[${index}].name`] = ""
            }}
            placeholder="Name" 
            className={cn("h-8 text-xs", errors[`pax[${index}].name`] && "border-red-500")} 
          />
          {errors[`pax[${index}].name`] && <p className="text-[10px] text-red-500 mt-0.5">{errors[`pax[${index}].name`]}</p>}
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] font-bold text-gray-500">Pax Type</Label>
          <CustomDropdown 
            value={entry.paxType}
            onValueChange={v => onUpdate(entry.id, 'paxType', v)}
            placeholder="Select" 
            options={paxTypeOptions} 
            className="h-8 text-xs" 
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] font-bold text-gray-500">Contact No</Label>
          <Input 
            value={entry.contactNo}
            onChange={e => onUpdate(entry.id, 'contactNo', e.target.value)}
            placeholder="Contact No" 
            className="h-8 text-xs" 
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] font-bold text-gray-500">Email</Label>
          <Input 
            value={entry.email}
            onChange={e => onUpdate(entry.id, 'email', e.target.value)}
            placeholder="Email" 
            className="h-8 text-xs" 
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] font-bold text-gray-500">Date of birth</Label>
          <DateInput 
            value={entry.dob}
            onChange={d => onUpdate(entry.id, 'dob', d)}
            placeholder="Select date" 
            className="h-8 text-xs" 
            disabled={true}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] font-bold text-gray-500">Date of issue</Label>
          <DateInput 
            value={entry.dateOfIssue}
            onChange={d => onUpdate(entry.id, 'dateOfIssue', d)}
            placeholder="Select date" 
            className="h-8 text-xs" 
            disabled={true}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] font-bold text-gray-500">Date of expire</Label>
          <div className="flex gap-2">
            <DateInput 
              value={entry.dateOfExpire}
              onChange={d => onUpdate(entry.id, 'dateOfExpire', d)}
              placeholder="Select date" 
              className="h-8 text-xs flex-1" 
              disabled={true}
            />
            <Button 
              size="icon" 
              variant="destructive" 
              className="h-8 w-8 shrink-0 bg-red-500 hover:bg-red-600"
              onClick={() => onRemove(entry.id)}
            >
              <X className="h-4 w-4" />
            </Button>
            {isLast && (
              <Button 
                size="icon" 
                className="h-8 w-8 shrink-0 bg-sky-400 hover:bg-sky-500"
                onClick={onAdd}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})

export const NonCommissionPaxInformation = memo(function NonCommissionPaxInformation({ 
  initialEntries, 
  onChange,
  passportsPreloaded,
  errors 
}: NonCommissionPaxInformationProps) {
  const [paxEntries, setPaxEntries] = useState<PaxEntry[]>(
    initialEntries && initialEntries.length > 0 
      ? initialEntries 
      : [{ id: "", passportId: "", name: "", paxType: "", contactNo: "", email: "" }]
  )

  const addPaxEntry = useCallback(() => {
    setPaxEntries(prev => [...prev, { 
      id: Date.now().toString(), 
      passportId: "", name: "", paxType: "Adult", contactNo: "", email: "" 
    }])
  }, [])

  const removePaxEntry = useCallback((id: string) => {
    setPaxEntries(prev => prev.length > 1 ? prev.filter(p => p.id !== id) : prev)
  }, [])

  const updatePaxEntry = useCallback((id: string, field: keyof PaxEntry, value: any) => {
    setPaxEntries(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
  }, [])

  const updatePaxEntryMultiple = useCallback((id: string, updates: Partial<PaxEntry>) => {
    setPaxEntries(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
  }, [])

  useEffect(() => {
    onChange(paxEntries)
  }, [paxEntries, onChange])

  return (
    <Card className="border-none shadow-sm rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-100/80 flex items-center gap-2 border-b">
        <User className="h-4 w-4 text-blue-500" />
        <span className="text-sm font-bold text-gray-700 uppercase tracking-tight">Pax & Passport Details</span>
      </div>
      <CardContent className="p-5 space-y-6">
        {paxEntries.map((entry, idx) => (
          <div key={entry.id} className="space-y-4">
            <PaxRow 
              entry={entry} 
              index={idx} 
              isLast={idx === paxEntries.length - 1}
              onUpdate={updatePaxEntry}
              onUpdateMultiple={updatePaxEntryMultiple}
              onRemove={removePaxEntry}
              onAdd={addPaxEntry}
              passportsPreloaded={passportsPreloaded}
              errors={errors}
            />
            {idx < paxEntries.length - 1 && <Separator className="bg-gray-100" />}
          </div>
        ))}
      </CardContent>
    </Card>
  )
})
