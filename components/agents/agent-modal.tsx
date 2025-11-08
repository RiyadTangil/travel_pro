"use client"

import { useEffect, useRef, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Props = {
  open: boolean
  onClose: () => void
  mode?: "add" | "edit" | "view"
  initialData?: any
  onSubmit?: (payload: any) => Promise<void> | void
}

const OPENING_BALANCE_TYPES = ["Due", "Advance"]

export function AgentModal({ open, onClose, mode = "add", initialData, onSubmit }: Props) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [commissionRate, setCommissionRate] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [nid, setNid] = useState("")
  const [openingBalanceType, setOpeningBalanceType] = useState("Due")
  const [agentPhoto, setAgentPhoto] = useState<File | null>(null)
  const [nidFront, setNidFront] = useState<File | null>(null)
  const [nidBack, setNidBack] = useState<File | null>(null)
  const [dob, setDob] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const photoRef = useRef<HTMLInputElement | null>(null)
  const frontRef = useRef<HTMLInputElement | null>(null)
  const backRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!open) return
    if (!initialData) return
    setName(initialData.name || "")
    setEmail(initialData.email || "")
    setCommissionRate((initialData.commissionRate ?? "").toString())
    setPhone(initialData.mobile || initialData.phone || "")
    setAddress(initialData.address || "")
    setNid(initialData.nid || "")
    setOpeningBalanceType(initialData.openingBalanceType || "Due")
    setDob(initialData.dob || "")
  }, [open, initialData])

  const disabled = mode === "view"
  const requiredMissing = !name || !commissionRate

  const handleSubmit = async () => {
    if (!onSubmit || requiredMissing) return
    setSubmitting(true)
    await onSubmit({
      name,
      email,
      commissionRate: Number(commissionRate) || 0,
      mobile: phone,
      phone,
      address,
      nid,
      openingBalanceType,
      dob,
      // file objects for now; integration can upload later
      agentPhoto,
      nidFront,
      nidBack,
    })
    setSubmitting(false)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[1100px]">
        <DialogHeader>
          <DialogTitle>{mode === "view" ? "View Agent" : mode === "edit" ? "Edit Agent" : "Add Agent"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>
              Agent Name <span className="text-red-500">*</span>
            </Label>
            <Input placeholder="Agent Name" value={name} onChange={(e) => setName(e.target.value)} disabled={disabled} />
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={disabled} />
          </div>

          <div className="space-y-2">
            <Label>
              Commision Rate <span className="text-red-500">*</span>
            </Label>
            <Input placeholder="Commision Rate" value={commissionRate} onChange={(e) => setCommissionRate(e.target.value)} disabled={disabled} />
          </div>

          <div className="space-y-2">
            <Label>Phone No</Label>
            <Input placeholder="Phone No" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={disabled} />
          </div>

          <div className="space-y-2 md:col-span-1">
            <Label>Agent Address</Label>
            <Input placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} disabled={disabled} />
          </div>

          <div className="space-y-2">
            <Label>NID No</Label>
            <Input placeholder="NID No" value={nid} onChange={(e) => setNid(e.target.value)} disabled={disabled} />
          </div>

          <div className="space-y-2">
            <Label>Agent Image</Label>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => photoRef.current?.click()} disabled={disabled}>
                Upload Agent Photo
              </Button>
              <input ref={photoRef} type="file" className="hidden" onChange={(e) => setAgentPhoto(e.target.files?.[0] || null)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Agent ID Card Font Side</Label>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => frontRef.current?.click()} disabled={disabled}>
                Upload NID Front
              </Button>
              <input ref={frontRef} type="file" className="hidden" onChange={(e) => setNidFront(e.target.files?.[0] || null)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Agent ID Card Back Side</Label>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => backRef.current?.click()} disabled={disabled}>
                Upload NID Back
              </Button>
              <input ref={backRef} type="file" className="hidden" onChange={(e) => setNidBack(e.target.files?.[0] || null)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Date of birth</Label>
            <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} disabled={disabled} />
          </div>

          <div className="space-y-2">
            <Label>Opening Balance Type</Label>
            <Select value={openingBalanceType} onValueChange={setOpeningBalanceType} disabled={disabled}>
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                {OPENING_BALANCE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t mt-4">
          <Button variant="outline" onClick={onClose}>
            {mode === "view" ? "Close" : "Cancel"}
          </Button>
          {mode !== "view" && (
            <Button onClick={handleSubmit} disabled={requiredMissing || submitting} className="bg-blue-600">
              {mode === "edit" ? (submitting ? "Updating..." : "Update Agent") : submitting ? "Creating..." : "Create Agent"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}