"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { RotateCcw } from "lucide-react"
import { SearchInput } from "@/components/shared/search-input"
import { DateRangePickerWithPresets } from "@/components/shared/date-range-with-presets"
import { DateRange } from "react-day-picker"

type Props = {
  dateRange: DateRange | undefined
  search: string
  onDateRangeChange: (range: DateRange | undefined) => void
  onSearchChange: (val: string) => void
  onRefresh: () => void
  showRefresh?: boolean
}

export default function FilterBar({ 
  dateRange, 
  search, 
  onDateRangeChange, 
  onSearchChange, 
  onRefresh,
  showRefresh = true
}: Props) {
  return (
    <div className="flex items-center gap-3 mb-4 bg-white p-3 rounded-md border shadow-sm">
      <DateRangePickerWithPresets
        date={dateRange}
        onDateChange={onDateRangeChange}
        className="w-[300px]"
      />
      
      <SearchInput 
        value={search}
        onChange={onSearchChange}
        placeholder="Search receipts..."
        className="max-w-sm"
      />

      {showRefresh && (
        <Button type="button" variant="outline" size="icon" onClick={onRefresh} title="Refresh">
          <RotateCcw className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
