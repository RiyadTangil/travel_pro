"use client"

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface PaginationWithLinksProps {
  totalCount: number
  pageSize: number
  page: number
  setPage: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
}

export function PaginationWithLinks({
  totalCount,
  pageSize,
  page,
  setPage,
  onPageSizeChange,
}: PaginationWithLinksProps) {
  const totalPages = Math.ceil(totalCount / pageSize)

  const renderPageNumbers = () => {
    const items = []
    const maxVisiblePages = 5

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              onClick={() => setPage(i)}
              isActive={page === i}
              className="cursor-pointer"
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        )
      }
    } else {
      // Always show first page
      items.push(
        <PaginationItem key={1}>
          <PaginationLink
            onClick={() => setPage(1)}
            isActive={page === 1}
            className="cursor-pointer"
          >
            1
          </PaginationLink>
        </PaginationItem>
      )

      // Show ellipsis if current page is far from start
      if (page > 3) {
        items.push(
          <PaginationItem key="ellipsis-start">
            <PaginationEllipsis />
          </PaginationItem>
        )
      }

      // Show current page and neighbors
      const start = Math.max(2, page - 1)
      const end = Math.min(totalPages - 1, page + 1)

      for (let i = start; i <= end; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              onClick={() => setPage(i)}
              isActive={page === i}
              className="cursor-pointer"
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        )
      }

      // Show ellipsis if current page is far from end
      if (page < totalPages - 2) {
        items.push(
          <PaginationItem key="ellipsis-end">
            <PaginationEllipsis />
          </PaginationItem>
        )
      }

      // Always show last page
      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink
            onClick={() => setPage(totalPages)}
            isActive={page === totalPages}
            className="cursor-pointer"
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      )
    }

    return items
  }

  return (
    <div className="flex items-center justify-end gap-4 mt-4 print:hidden">
      {onPageSizeChange && (
        <div className="flex items-center gap-2">
          <Select
            value={pageSize.toString()}
            onValueChange={(v) => onPageSizeChange(Number(v))}
          >
            <SelectTrigger className="h-8 w-[110px]">
              <SelectValue placeholder={`${pageSize} / page`} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 50, 100].map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size} / page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {totalPages > 1 && (
        <Pagination className="justify-end m-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage(Math.max(1, page - 1))}
                className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            {renderPageNumbers()}
            <PaginationItem>
              <PaginationNext
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}
