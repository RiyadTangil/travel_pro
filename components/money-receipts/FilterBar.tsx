"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { RotateCcw } from "lucide-react"
import { DateInput } from "@/components/ui/date-input"

type Props = {
  startDate?: string
  endDate?: string
  search?: string
  onStartDateChange: (value: string) => void
  onEndDateChange: (value: string) => void
  onSearchChange: (value: string) => void
  onRefresh: () => void
}

export default function FilterBar({ startDate, endDate, search, onStartDateChange, onEndDateChange, onSearchChange, onRefresh }: Props) {
  return (
    <div className="flex items-center gap-2">
      <DateInput
        value={startDate ? new Date(startDate) : undefined}
        onChange={(d) => onStartDateChange(d ? d.toISOString().slice(0, 10) : "")}
        placeholder="Start date..."
        className="w-40"
      />
      <DateInput
        value={endDate ? new Date(endDate) : undefined}
        onChange={(d) => onEndDateChange(d ? d.toISOString().slice(0, 10) : "")}
        placeholder="End date..."
        className="w-40"
      />
      <Input
        placeholder="Search Here..."
        value={search ?? ""}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-56"
      />
      <Button type="button" variant="ghost" size="icon" onClick={onRefresh}>
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>
  )
}
