"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { RotateCcw } from "lucide-react"

type Props = {
  onAdd: () => void
  onExcel?: () => void
  onSearch?: (q: string) => void
  onRefresh?: () => void
  status?: string
  onStatusChange?: (s: string) => void
  startDate?: string
  endDate?: string
  onStartDateChange?: (d: string) => void
  onEndDateChange?: (d: string) => void
}

export function PassportToolbar({ onAdd, onExcel, onSearch, onRefresh, status = "All", onStatusChange, startDate = "", endDate = "", onStartDateChange, onEndDateChange }: Props) {
  const [q, setQ] = useState("")
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Button onClick={onAdd} className="bg-blue-600 hover:bg-blue-700">+ Add Passport</Button>
          <Button variant="secondary" onClick={onExcel}>Excel Report</Button>
        </div>
        <div className="flex items-center gap-3">
          <Select value={status} onValueChange={(v) => onStatusChange?.(v)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              {['All','PENDING','APPROVED','DELIVERED'].map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Start date</Label>
              <Input type="date" value={startDate} onChange={(e) => onStartDateChange?.(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">End date</Label>
              <Input type="date" value={endDate} onChange={(e) => onEndDateChange?.(e.target.value)} className="w-40" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={q}
              onChange={(e) => {
                const v = e.target.value
                setQ(v)
                onSearch?.(v)
              }}
              placeholder="Search Here..."
              className="w-64"
            />
            <Button variant="ghost" size="icon" onClick={onRefresh}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}