"use client"

import { Badge } from "@/components/ui/badge"

type StatusBadgeProps = {
  status: string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const statusStyles = {
    "file-ready": "bg-blue-100 text-blue-800",
    medical: "bg-purple-100 text-purple-800",
    mofa: "bg-yellow-100 text-yellow-800",
    "visa-stamping": "bg-indigo-100 text-indigo-800",
    fingerprint: "bg-pink-100 text-pink-800",
    manpower: "bg-orange-100 text-orange-800",
    "flight-ticket": "bg-green-100 text-green-800",
    completed: "bg-green-100 text-green-800",
  }

  const statusLabels = {
    "file-ready": "File Ready",
    medical: "Medical",
    mofa: "MOFA",
    "visa-stamping": "Visa Stamping",
    fingerprint: "Fingerprint",
    manpower: "Manpower",
    "flight-ticket": "Flight/Ticket",
    completed: "Completed",
  }

  return (
    <Badge className={statusStyles[status] || "bg-gray-100 text-gray-800"}>
      {statusLabels[status] || status}
    </Badge>
  )
}