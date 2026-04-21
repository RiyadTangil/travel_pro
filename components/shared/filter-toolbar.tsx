"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { RotateCcw } from "lucide-react"
import { SearchInput } from "@/components/shared/search-input"
import { DateRangePickerWithPresets } from "@/components/shared/date-range-with-presets"
import { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"

export type FilterToolbarProps = {
  className?: string
  children?: React.ReactNode
  /** Search box */
  showSearch?: boolean
  search?: string
  onSearchChange?: (val: string) => void
  searchPlaceholder?: string
  /** Date range */
  showDateRange?: boolean
  dateRange?: DateRange | undefined
  onDateRangeChange?: (range: DateRange | undefined) => void
  /** Refresh */
  showRefresh?: boolean
  onRefresh?: () => void
}

export default function FilterToolbar({
  children,
  className,
  showSearch = false,
  search = "",
  onSearchChange,
  searchPlaceholder = "Search...",
  showDateRange = false,
  dateRange,
  onDateRangeChange,
  showRefresh = true,
  onRefresh,
}: FilterToolbarProps) {
  const hasAny =
    (showDateRange && onDateRangeChange) ||
    (showSearch && onSearchChange) ||
    (showRefresh && onRefresh)

  if (!hasAny) return null

  return (
    <div className="flex justify-between items-center w-full  bg-white p-3 rounded-md border shadow-sm">
      {children}
      <div
        className={cn(
          "flex flex-wrap items-center justify-end gap-3",
          className
        )}
      >

        {showDateRange && onDateRangeChange && (
          <DateRangePickerWithPresets
            date={dateRange}
            onDateChange={onDateRangeChange}
            className="w-[300px]"
          />
        )}

        {showSearch && onSearchChange && (
          <SearchInput
            value={search}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
            className="max-w-sm"
          />
        )}

        {showRefresh && onRefresh && (
          <Button type="button" variant="outline" size="icon" onClick={onRefresh} title="Refresh">
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
