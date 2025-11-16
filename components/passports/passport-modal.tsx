"use client"

import { useMemo, useRef, useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DateInput } from "@/components/ui/date-input"
import { format } from "date-fns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import ClientSelect from "@/components/clients/client-select"
import AddClientModal from "@/components/clients/add-client-modal"

type PassportPayload = {
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

type Props = {
  open: boolean
  onClose: () => void
  onSubmit?: (payload: PassportPayload) => Promise<void> | void
  mode?: "add" | "edit"
  initialValues?: Partial<PassportPayload>
}

const PAX_TYPES = ["Adult", "Child", "Infant"]

export function PassportModal({ open, onClose, onSubmit, mode = "add", initialValues }: Props) {
  const [clientId, setClientId] = useState("")
  const [passportNo, setPassportNo] = useState("")
  const [paxType, setPaxType] = useState("")
  const [name, setName] = useState("")
  const [mobile, setMobile] = useState("")
  const [email, setEmail] = useState("")
  const [nid, setNid] = useState("")
  const [dob, setDob] = useState("")
  const [doi, setDoi] = useState("")
  const [doe, setDoe] = useState("")
  const [note, setNote] = useState("")
  const [otherFiles, setOtherFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)

  const passportRef = useRef<HTMLInputElement | null>(null)
  const profileRef = useRef<HTMLInputElement | null>(null)
  const otherRef = useRef<HTMLInputElement | null>(null)
  const [passportImage, setPassportImage] = useState<File | null>(null)
  const [profileImage, setProfileImage] = useState<File | null>(null)

  const requiredMissing = !passportNo || !name || !mobile

  const remainingDays = useMemo(() => {
    if (!doe) return ""
    const diff = Math.ceil((new Date(doe).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return diff > 0 ? `${diff} days` : `${diff} days`
  }, [doe])

  const handleAddMore = () => {
    otherRef.current?.click()
  }

  const handleSubmit = async () => {
    if (!onSubmit || requiredMissing) return
    setSubmitting(true)
    await onSubmit({
      clientId,
      passportNo,
      paxType,
      name,
      mobile,
      email,
      nid,
      dob,
      dateOfIssue: doi,
      dateOfExpire: doe,
      note,
    })
    setSubmitting(false)
    onClose()
  }

  // hydrate values when editing
  useEffect(() => {
    if (!open) return
    if (initialValues) {
      setClientId(initialValues.clientId || "")
      setPassportNo(initialValues.passportNo || "")
      setPaxType(initialValues.paxType || "")
      setName(initialValues.name || "")
      setMobile(initialValues.mobile || "")
      setEmail(initialValues.email || "")
      setNid(initialValues.nid || "")
      setDob(initialValues.dob || "")
      setDoi(initialValues.dateOfIssue || "")
      setDoe(initialValues.dateOfExpire || "")
      setNote(initialValues.note || "")
    }
  }, [open, initialValues])

  const [showAddClient, setShowAddClient] = useState(false)
  const [addingClient, setAddingClient] = useState(false)
  const handleAddClient = async (payload: any) => {
    try {
      setAddingClient(true)
      const res = await fetch('/api/clients-manager', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (res.ok && data.client?.id) {
        setClientId(data.client.id)
        setShowAddClient(false)
      }
    } finally {
      setAddingClient(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[1100px]">
        <DialogHeader>
          <DialogTitle>Create Passport</DialogTitle>
        </DialogHeader>

        <div className="border rounded-md p-4">
          <div className="font-medium mb-3">Passport Information</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Select Client</Label>
              <ClientSelect value={clientId} onChange={(id) => setClientId(id || "")} onRequestAdd={() => setShowAddClient(true)} />
            </div>

            <div className="space-y-2">
              <Label>Select Pax Type</Label>
              <Select value={paxType} onValueChange={setPaxType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Pax Type" />
                </SelectTrigger>
                <SelectContent>
                  {PAX_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Passport No. <span className="text-red-500">*</span></Label>
              <Input placeholder="Passport No." value={passportNo} onChange={(e) => setPassportNo(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Name <span className="text-red-500">*</span></Label>
              <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Mobile <span className="text-red-500">*</span></Label>
              <Input placeholder="Mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Nid No.</Label>
              <Input placeholder="NID No." value={nid} onChange={(e) => setNid(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Date of Birth</Label>
              <DateInput
                value={dob ? new Date(dob) : undefined}
                onChange={(d) => setDob(d ? format(d, "yyyy-MM-dd") : "")}
              />
            </div>

            <div className="space-y-2">
              <Label>Date of Issue</Label>
              <DateInput
                value={doi ? new Date(doi) : undefined}
                onChange={(d) => setDoi(d ? format(d, "yyyy-MM-dd") : "")}
              />
            </div>

            <div className="space-y-2">
              <Label>Date of Expire</Label>
              <DateInput
                value={doe ? new Date(doe) : undefined}
                onChange={(d) => setDoe(d ? format(d, "yyyy-MM-dd") : "")}
              />
            </div>

            <div className="space-y-2 md:col-span-3">
              <Label>Note</Label>
              <Input placeholder="Note something" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="space-y-2">
              <Label>Upload Passport (Max 1 MB)</Label>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => passportRef.current?.click()}>Passport image</Button>
                <input ref={passportRef} type="file" className="hidden" onChange={(e) => setPassportImage(e.target.files?.[0] || null)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Upload Photo (Max 1 MB)</Label>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => profileRef.current?.click()}>Profile image</Button>
                <input ref={profileRef} type="file" className="hidden" onChange={(e) => setProfileImage(e.target.files?.[0] || null)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Upload Others (Max 1 MB)</Label>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => otherRef.current?.click()}>Other image</Button>
                <input ref={otherRef} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && setOtherFiles((prev) => [...prev, e.target.files![0]])} />
              </div>
            </div>
          </div>

          <div className="mt-4">
            <Button variant="outline" onClick={handleAddMore}>+ Add More</Button>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose} className="mr-2">Cancel</Button>
          <Button className="bg-blue-600" disabled={requiredMissing || submitting} onClick={handleSubmit}>
            {submitting ? (mode === "edit" ? "Saving..." : "Creating...") : (mode === "edit" ? "Save Changes" : "Create Passport")}
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