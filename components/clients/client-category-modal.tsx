"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ClientCategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (name: string, prefix: string, status: "active" | "inactive", companyId: string | null) => Promise<void> | void
  initialName?: string
  initialPrefix?: string
  title?: string
  submitLabel?: string
  loading?: boolean
}

export function ClientCategoryModal({ isOpen, onClose, onSubmit, initialName = "", initialPrefix = "", title = "Add Client Category", submitLabel = "Submit", loading = false }: ClientCategoryModalProps) {
  const { data: session } = useSession()
  const [name, setName] = useState(initialName)
  const [prefix, setPrefix] = useState(initialPrefix)
  const [status, setStatus] = useState<"active" | "inactive">("active")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async(e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      if (!name.trim() || !prefix.trim()) return
      await onSubmit(name.trim(), prefix.trim(), status, session?.user?.companyId ?? null)
      setName("")
      setPrefix("")
      setStatus("active")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Populate fields when opening in edit mode or when initial values change
  useEffect(() => {
    if (isOpen) {
      setName(initialName || "")
      setPrefix(initialPrefix || "")
    }
  }, [isOpen, initialName, initialPrefix])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cc-name">Enter Category Name *</Label>
            <Input id="cc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Air Tickets" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cc-prefix">Category Prefix *</Label>
            <Input id="cc-prefix" value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="AT" required />
          </div>
          {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cc-status">Status *</Label>
              <select
                id="cc-status"
                className="border rounded h-9 px-2"
                value={status}
                onChange={(e) => setStatus(e.target.value as "active" | "inactive")}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          
          </div> */}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={loading || isSubmitting || !name.trim() || !prefix.trim()}>
              {loading || isSubmitting ? "Submitting..." : submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}