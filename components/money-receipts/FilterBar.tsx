"use client"

import FilterToolbar from "@/components/shared/filter-toolbar"
import { DateRange } from "react-day-picker"

type Props = {
  dateRange: DateRange | undefined
  search: string
  onDateRangeChange: (range: DateRange | undefined) => void
  onSearchChange: (val: string) => void
  onRefresh: () => void
  showRefresh?: boolean
}

/** @deprecated Prefer importing `FilterToolbar` from `@/components/shared/filter-toolbar` */
export default function FilterBar({
  dateRange,
  search,
  onDateRangeChange,
  onSearchChange,
  onRefresh,
  showRefresh = true,
}: Props) {
  return (
    <FilterToolbar
      showDateRange
      dateRange={dateRange}
      onDateRangeChange={onDateRangeChange}
      showSearch
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search receipts..."
      showRefresh={showRefresh}
      onRefresh={onRefresh}
    />
  )
}
