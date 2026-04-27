"use client"

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
  /** Extra controls rendered BEFORE the date range (right side) */
  filterExtrasBefore?: React.ReactNode
  /** Extra controls rendered AFTER the search (right side, before refresh) */
  filterExtras?: React.ReactNode
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
  filterExtrasBefore,
  filterExtras,
}: FilterToolbarProps) {
  const hasAny =
    (showDateRange && onDateRangeChange) ||
    (showSearch && onSearchChange) ||
    (showRefresh && onRefresh) ||
    !!filterExtras ||
    !!filterExtrasBefore

  if (!hasAny) return null

  return (
    <div
      className={cn(
        "flex max-w-full items-center gap-2 rounded-md border bg-white p-3 shadow-sm",
        /* Narrow: single horizontal row + scroll (same idea as wide Ant tables) */
        "min-w-0 flex-nowrap overflow-x-auto overflow-y-visible [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]",
        "md:flex-wrap md:justify-between md:overflow-x-visible",
      )}
    >
      {children != null && children !== false && (
        <div className="flex shrink-0 items-center">{children}</div>
      )}
      <div
        className={cn(
          "flex min-w-0 shrink-0 flex-nowrap items-center gap-2",
          "md:w-auto md:flex-1 md:flex-wrap md:justify-end",
          className,
        )}
      >
        {filterExtrasBefore}

        {showDateRange && onDateRangeChange && (
          <div className="shrink-0">
            <DateRangePickerWithPresets
              date={dateRange}
              onDateChange={onDateRangeChange}
              className="w-[min(280px,calc(100vw-5rem))] md:w-[300px]"
            />
          </div>
        )}

        {showSearch && onSearchChange && (
          <div className="w-[min(18rem,calc(100vw-6rem))] shrink-0 md:min-w-[12rem] md:max-w-sm md:flex-1">
            <SearchInput
              value={search}
              onChange={onSearchChange}
              placeholder={searchPlaceholder}
              className="max-w-none"
            />
          </div>
        )}

        {filterExtras}

        {showRefresh && onRefresh && (
          <Button type="button" variant="outline" size="icon" onClick={onRefresh} title="Refresh">
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
