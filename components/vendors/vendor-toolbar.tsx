"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Props = {
  onAddVendor: () => void
  search?: string
  onSearchChange?: (v: string) => void
}

export function VendorToolbar({ onAddVendor, search = "", onSearchChange }: Props) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-2">
        <Button onClick={onAddVendor} className="bg-blue-600 hover:bg-blue-700">+ Add Vendor</Button>
        <Button variant="outline">Excel Report</Button>
      </div>
      <div className="w-[320px]">
        <Input value={search} onChange={(e) => onSearchChange?.(e.target.value)} placeholder="Search by vendor" />
      </div>
    </div>
  )
}