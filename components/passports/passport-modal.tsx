"use client"

import { useEffect, useRef, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DateInput } from "@/components/ui/date-input"
import { format } from "date-fns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Trash2 } from "lucide-react"
import ClientSelect from "@/components/clients/client-select"
import AddClientModal from "@/components/clients/add-client-modal"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PassportPayload = {
  clientId: string
  passportNo: string
  paxType?: string
  name: string
  mobile: string
  email?: string
  nid?: string
  dob?: string
  dateOfIssue?: string
  dateOfExpire?: string
  note?: string
}

interface EntryState {
  clientId: string
  passportNo: string
  paxType: string
  name: string
  mobile: string
  email: string
  nid: string
  dob: string
  doi: string
  doe: string
  note: string
  passportImage: File | null
  profileImage: File | null
  otherFiles: File[]
}

type Props = {
  open: boolean
  onClose: () => void
  onSubmit?: (payload: PassportPayload | PassportPayload[]) => Promise<void> | void
  mode?: "add" | "edit"
  initialValues?: Partial<PassportPayload>
}

const PAX_TYPES = ["Adult", "Child", "Infant"]

function emptyEntry(): EntryState {
  return {
    clientId: "", passportNo: "", paxType: "", name: "", mobile: "",
    email: "", nid: "", dob: "", doi: "", doe: "", note: "",
    passportImage: null, profileImage: null, otherFiles: [],
  }
}

function entryFromInitial(v: Partial<PassportPayload>): EntryState {
  return {
    clientId:     v.clientId     || "",
    passportNo:   v.passportNo   || "",
    paxType:      v.paxType      || "",
    name:         v.name         || "",
    mobile:       v.mobile       || "",
    email:        v.email        || "",
    nid:          v.nid          || "",
    dob:          v.dob          || "",
    doi:          v.dateOfIssue  || "",
    doe:          v.dateOfExpire || "",
    note:         v.note         || "",
    passportImage: null, profileImage: null, otherFiles: [],
  }
}

function entryToPayload(e: EntryState): PassportPayload {
  return {
    clientId:     e.clientId,
    passportNo:   e.passportNo,
    paxType:      e.paxType,
    name:         e.name,
    mobile:       e.mobile,
    email:        e.email,
    nid:          e.nid,
    dob:          e.dob,
    dateOfIssue:  e.doi,
    dateOfExpire: e.doe,
    note:         e.note,
  }
}

// ---------------------------------------------------------------------------
// Single entry form (used for each row in add-multi mode and in edit mode)
// ---------------------------------------------------------------------------

interface EntryFormProps {
  idx: number
  total: number
  entry: EntryState
  onChange: (idx: number, partial: Partial<EntryState>) => void
  onRemove?: (idx: number) => void
  onRequestAddClient: () => void
}

function EntryForm({ idx, total, entry, onChange, onRemove, onRequestAddClient }: EntryFormProps) {
  const passportRef = useRef<HTMLInputElement | null>(null)
  const profileRef  = useRef<HTMLInputElement | null>(null)
  const otherRef    = useRef<HTMLInputElement | null>(null)

  const set = (partial: Partial<EntryState>) => onChange(idx, partial)

  return (
    <div className="border rounded-md p-4 relative">
      {total > 1 && (
        <div className="flex items-center justify-between mb-3">
          <span className="font-medium text-sm text-gray-600">Passport #{idx + 1}</span>
          {onRemove && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-700 h-7 px-2"
              onClick={() => onRemove(idx)}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Remove
            </Button>
          )}
        </div>
      )}

      {total === 1 && (
        <div className="font-medium mb-3">Passport Information</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Select Client</Label>
          <ClientSelect
            value={entry.clientId || undefined}
            onChange={(id) => set({ clientId: id || "" })}
            onRequestAdd={onRequestAddClient}
          />
        </div>

        <div className="space-y-2">
          <Label>Select Pax Type</Label>
          <Select value={entry.paxType} onValueChange={(v) => set({ paxType: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select Pax Type" />
            </SelectTrigger>
            <SelectContent>
              {PAX_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Passport No. <span className="text-red-500">*</span></Label>
          <Input
            placeholder="Passport No."
            value={entry.passportNo}
            onChange={(e) => set({ passportNo: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Name <span className="text-red-500">*</span></Label>
          <Input
            placeholder="Name"
            value={entry.name}
            onChange={(e) => set({ name: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Mobile <span className="text-red-500">*</span></Label>
          <Input
            placeholder="Mobile"
            value={entry.mobile}
            onChange={(e) => set({ mobile: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Email</Label>
          <Input
            placeholder="Email"
            value={entry.email}
            onChange={(e) => set({ email: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>NID No.</Label>
          <Input
            placeholder="NID No."
            value={entry.nid}
            onChange={(e) => set({ nid: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Date of Birth</Label>
          <DateInput
            value={entry.dob ? new Date(entry.dob) : undefined}
            onChange={(d) => set({ dob: d ? format(d, "yyyy-MM-dd") : "" })}
          />
        </div>

        <div className="space-y-2">
          <Label>Date of Issue</Label>
          <DateInput
            value={entry.doi ? new Date(entry.doi) : undefined}
            onChange={(d) => set({ doi: d ? format(d, "yyyy-MM-dd") : "" })}
          />
        </div>

        <div className="space-y-2">
          <Label>Date of Expire</Label>
          <DateInput
            value={entry.doe ? new Date(entry.doe) : undefined}
            onChange={(d) => set({ doe: d ? format(d, "yyyy-MM-dd") : "" })}
          />
        </div>

        <div className="space-y-2 md:col-span-3">
          <Label>Note</Label>
          <Input
            placeholder="Note something"
            value={entry.note}
            onChange={(e) => set({ note: e.target.value })}
          />
        </div>
      </div>

      {/* File uploads */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <div className="space-y-2">
          <Label>Upload Passport (Max 1 MB)</Label>
          <div className="flex items-center gap-2">
            <Button variant="outline" type="button" onClick={() => passportRef.current?.click()}>
              Passport image
            </Button>
            {entry.passportImage && (
              <span className="text-xs text-muted-foreground truncate max-w-[120px]">{entry.passportImage.name}</span>
            )}
            <input
              ref={passportRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => set({ passportImage: e.target.files?.[0] || null })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Upload Photo (Max 1 MB)</Label>
          <div className="flex items-center gap-2">
            <Button variant="outline" type="button" onClick={() => profileRef.current?.click()}>
              Profile image
            </Button>
            {entry.profileImage && (
              <span className="text-xs text-muted-foreground truncate max-w-[120px]">{entry.profileImage.name}</span>
            )}
            <input
              ref={profileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => set({ profileImage: e.target.files?.[0] || null })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Upload Others (Max 1 MB)</Label>
          <div className="flex items-center gap-2">
            <Button variant="outline" type="button" onClick={() => otherRef.current?.click()}>
              Other image
            </Button>
            {entry.otherFiles.length > 0 && (
              <span className="text-xs text-muted-foreground">{entry.otherFiles.length} file(s)</span>
            )}
            <input
              ref={otherRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  set({ otherFiles: [...entry.otherFiles, e.target.files[0]] })
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

export function PassportModal({ open, onClose, onSubmit, mode = "add", initialValues }: Props) {
  const [entries, setEntries]             = useState<EntryState[]>([emptyEntry()])
  const [submitting, setSubmitting]       = useState(false)
  const [showAddClient, setShowAddClient] = useState(false)
  const [addingClient, setAddingClient]   = useState(false)
  // Track which entry requested the add-client modal
  const requestingClientIdx = useRef<number>(0)

  // Re-initialise entries whenever the modal opens
  useEffect(() => {
    if (!open) return
    if (mode === "edit" && initialValues) {
      setEntries([entryFromInitial(initialValues)])
    } else {
      setEntries([emptyEntry()])
    }
  }, [open, mode, initialValues])

  const handleEntryChange = (idx: number, partial: Partial<EntryState>) => {
    setEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, ...partial } : e)))
  }

  const handleAddMore = () => {
    setEntries((prev) => [...prev, emptyEntry()])
  }

  const handleRemove = (idx: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== idx))
  }

  const isValid = entries.every((e) => e.passportNo.trim() && e.name.trim() && e.mobile.trim())

  const handleSubmit = async () => {
    if (!onSubmit || !isValid) return
    setSubmitting(true)
    try {
      const payloads = entries.map(entryToPayload)
      await onSubmit(mode === "edit" ? payloads[0] : payloads)
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddClient = async (payload: any) => {
    try {
      setAddingClient(true)
      const res = await fetch("/api/clients-manager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok && data.client?.id) {
        handleEntryChange(requestingClientIdx.current, { clientId: data.client.id })
        setShowAddClient(false)
      }
    } finally {
      setAddingClient(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[1100px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit Passport" : "Create Passport"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {entries.map((entry, idx) => (
            <div key={idx}>
              {idx > 0 && <Separator className="my-2" />}
              <EntryForm
                idx={idx}
                total={entries.length}
                entry={entry}
                onChange={handleEntryChange}
                onRemove={entries.length > 1 ? handleRemove : undefined}
                onRequestAddClient={() => {
                  requestingClientIdx.current = idx
                  setShowAddClient(true)
                }}
              />
            </div>
          ))}

          {mode === "add" && (
            <Button type="button" variant="outline" onClick={handleAddMore}>
              + Add More
            </Button>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            disabled={!isValid || submitting}
            onClick={handleSubmit}
          >
            {submitting
              ? mode === "edit" ? "Saving..." : "Creating..."
              : mode === "edit" ? "Save Changes" : `Create Passport${entries.length > 1 ? ` (${entries.length})` : ""}`
            }
          </Button>
        </div>

        <AddClientModal
          open={showAddClient}
          onOpenChange={setShowAddClient}
          onSubmit={handleAddClient}
          loading={addingClient}
          mode="add"
        />
      </DialogContent>
    </Dialog>
  )
}
