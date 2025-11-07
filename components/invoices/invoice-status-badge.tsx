"use client"

import { Badge } from "@/components/ui/badge"
import { Invoice } from "@/types/invoice"

interface InvoiceStatusBadgeProps {
  status: Invoice['status']
  className?: string
}

export function InvoiceStatusBadge({ status, className }: InvoiceStatusBadgeProps) {
  const getStatusConfig = (status: Invoice['status']) => {
    switch (status) {
      case 'paid':
        return {
          label: 'PAID',
          className: 'bg-green-100 text-green-800 hover:bg-green-100'
        }
      case 'partial':
        return {
          label: 'PARTIAL',
          className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
        }
      case 'due':
        return {
          label: 'DUE',
          className: 'bg-blue-100 text-blue-800 hover:bg-blue-100'
        }
      case 'overdue':
        return {
          label: 'OVERDUE',
          className: 'bg-red-100 text-red-800 hover:bg-red-100'
        }
      default:
        return {
          label: 'UNKNOWN',
          className: 'bg-gray-100 text-gray-800 hover:bg-gray-100'
        }
    }
  }

  const config = getStatusConfig(status)

  return (
    <Badge 
      variant="secondary" 
      className={`${config.className} ${className}`}
    >
      {config.label}
    </Badge>
  )
}