"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface CategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (name: string, companyId: string | null) => Promise<void> | void
  initialName?: string
  title?: string
  submitLabel?: string
  loading?: boolean
}

export function CategoryModal({ isOpen, onClose, onSubmit, initialName = "", title = "Add Category", submitLabel = "Submit", loading = false }: CategoryModalProps) {
  const { data: session } = useSession()
  const [name, setName] = useState(initialName)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async(e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      if (!name.trim()) return
      await onSubmit(name.trim(), session?.user?.companyId ?? null)
      setName("")
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      setName(initialName || "")
    }
  }, [isOpen, initialName])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cat-name">Enter Category Name *</Label>
            <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Air Tickets" required />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={loading || isSubmitting || !name.trim()}>
              {loading || isSubmitting ? "Submitting..." : submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}