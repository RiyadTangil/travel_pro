"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Button } from "@/components/ui/button"
import { InlineLoader } from "@/components/ui/loader"

export type TransportTypeItem = { id?: string; name: string; active: boolean }

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  initialItem?: TransportTypeItem | null
  onSubmit: (payload: TransportTypeItem) => Promise<void> | void
  submitting?: boolean
}

export default function TransportTypeModal({ open, onOpenChange, initialItem, onSubmit, submitting }: Props) {
  const [name, setName] = useState("")
  const [status, setStatus] = useState<"active" | "inactive">("active")

  useEffect(() => {
    if (!open) return
    setName(initialItem?.name || "")
    setStatus(initialItem?.active === false ? "inactive" : "active")
  }, [open, initialItem])

  const isValid = useMemo(() => !!name.trim(), [name])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    await onSubmit({ id: initialItem?.id, name: name.trim(), active: status === "active" })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initialItem?.id ? "Edit Transport Type" : "Add New Transport Type"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input placeholder="Enter transport type name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Transport Type Status: <span className="text-red-500">*</span></Label>
            <RadioGroup className="mt-2 flex items-center gap-6" value={status} onValueChange={(v) => setStatus(v as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="active" id="tt-active" />
                <Label htmlFor="tt-active">Active</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="inactive" id="tt-inactive" />
                <Label htmlFor="tt-inactive">Inactive</Label>
              </div>
            </RadioGroup>
          </div>
          <Button type="submit" disabled={!isValid || submitting} className="bg-sky-500 hover:bg-sky-600">
            {submitting ? <span className="flex items-center gap-2"><InlineLoader /> Submit</span> : "Submit"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

