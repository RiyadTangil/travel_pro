"use client"

import { Badge } from "@/components/ui/badge"
import { type B2BClient } from "@/hooks/use-clients"

type ClientSourceBadgeProps = {
  associatedB2BId?: string
  b2bClients: B2BClient[]
}

export function ClientSourceBadge({ associatedB2BId, b2bClients }: ClientSourceBadgeProps) {
  if (associatedB2BId) {
    const b2bClient = b2bClients.find((client) => client._id === associatedB2BId)
    return (
      <Badge className="bg-purple-100 text-purple-800">
        {b2bClient ? `via ${b2bClient.name}` : "B2B Referred"}
      </Badge>
    )
  }
  return <Badge className="bg-green-100 text-green-800">Direct Client</Badge>
}