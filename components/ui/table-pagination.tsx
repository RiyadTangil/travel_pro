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

interface TablePaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function TablePagination({
  currentPage,
  totalPages,
  onPageChange,
}: TablePaginationProps) {
  if (totalPages <= 1) return null

  const renderPageLinks = () => {
    const items = []
    const maxVisible = 5
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2))
    let endPage = Math.min(totalPages, startPage + maxVisible - 1)
    
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1)
    }

    if (startPage > 1) {
      items.push(
        <PaginationItem key="1">
          <PaginationLink onClick={() => onPageChange(1)} isActive={currentPage === 1} className="cursor-pointer">1</PaginationLink>
        </PaginationItem>
      )
      if (startPage > 2) {
        items.push(<PaginationItem key="start-ellipsis"><PaginationEllipsis /></PaginationItem>)
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink 
            onClick={() => onPageChange(i)} 
            isActive={currentPage === i}
            className="cursor-pointer"
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      )
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        items.push(<PaginationItem key="end-ellipsis"><PaginationEllipsis /></PaginationItem>)
      }
      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink 
            onClick={() => onPageChange(totalPages)} 
            isActive={currentPage === totalPages}
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
    <Pagination className="mt-4 justify-end">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious 
            onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
            className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
          />
        </PaginationItem>
        {renderPageLinks()}
        <PaginationItem>
          <PaginationNext 
            onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
            className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
