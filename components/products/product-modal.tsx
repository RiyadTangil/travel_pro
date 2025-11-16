"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { InlineLoader } from "@/components/ui/loader"

export type ProductItem = {
  id: string
  name: string
  status: 1 | 0
  categoryId: string
  categoryTitle: string
  companyId: string | null
  createdAt?: string
}

type CategoryOption = { id: string; name: string }

interface ProductModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSubmit: (payload: { name: string; categoryId: string; companyId: string | null }) => Promise<void> | void
  initialItem?: ProductItem | null
  loading?: boolean
}

export default function ProductModal({ open, onOpenChange, onSubmit, initialItem, loading }: ProductModalProps) {
  const { data: session } = useSession()
  const [name, setName] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    const loadCategories = async () => {
      try {
        const res = await fetch(`/api/categories?page=1&pageSize=100`, {
          headers: { "x-company-id": session?.user?.companyId ?? "" },
          signal: controller.signal,
        })
        const data = await res.json()
        const items = (data.data || []).map((d: any) => ({ id: d.id, name: d.name }))
        if (active) setCategories(items)
      } catch (e) {
        if (active) setCategories([])
      }
    }
    if (open) loadCategories()
    return () => { active = false; controller.abort() }
  }, [open, session?.user?.companyId])

  useEffect(() => {
    if (open) {
      setName(initialItem?.name || "")
      setCategoryId(initialItem?.categoryId || "")
      setError(null)
    }
  }, [open, initialItem])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !categoryId) return
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({ name: name.trim(), categoryId, companyId: session?.user?.companyId ?? null })
      setName("")
      setCategoryId("")
    } catch (err: any) {
      setError(err?.message || "Failed to submit")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{initialItem ? "Edit Product" : "Add New Product"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prod-name">* Product Name:</Label>
            <Input id="prod-name" placeholder="Enter product name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prod-category">* Product Category:</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="prod-category">
                <SelectValue placeholder="Enter Product Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center gap-2 pt-2">
            <Button type="submit" className="bg-blue-500 hover:bg-blue-600" disabled={loading || submitting || !name.trim() || !categoryId}>
              {loading || submitting ? (<span className="flex items-center gap-2"><InlineLoader /> Submitting...</span>) : "Submit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}