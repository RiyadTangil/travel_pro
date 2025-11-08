"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RotateCcw } from "lucide-react"

type Props = {
  onAdd: () => void
  onSearch?: (q: string) => void
  onRefresh?: () => void
}

export function AgentToolbar({ onAdd, onSearch, onRefresh }: Props) {
  const [q, setQ] = useState("")
  return (
    <div className="flex items-center justify-between mb-3">
      <Button onClick={onAdd} className="bg-blue-600 hover:bg-blue-700">+ Add Agent</Button>
      <div className="flex items-center gap-2">
        <Input
          value={q}
          onChange={(e) => {
            const v = e.target.value
            setQ(v)
            onSearch?.(v)
          }}
          placeholder="Search by agent"
          className="w-64"
        />
        <Button variant="ghost" size="icon" onClick={onRefresh}>
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}