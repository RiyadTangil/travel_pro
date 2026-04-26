"use client"

import { useEffect, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { InlineLoader } from "@/components/ui/loader"
import { TableRowActions } from "@/components/shared/table-row-actions"

type Agent = {
  id: string
  name: string
  mobile: string
  email: string
  commissionRate: number
}

type Props = {
  data: Agent[]
  loading?: boolean
  loadingId?: string | null
  onView?: (agent: Agent) => void
  onEdit?: (agent: Agent) => void
  onDelete?: (agent: Agent) => void
}

const NARROW_MAX = 768

export function AgentTable({ data, loading = false, loadingId, onView, onEdit, onDelete }: Props) {
  const [narrowViewport, setNarrowViewport] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${NARROW_MAX}px)`)
    const apply = () => setNarrowViewport(mq.matches)
    apply()
    mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [])

  return (
    <div className="min-w-0 overflow-hidden rounded-md border bg-white shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-12 whitespace-nowrap">Sl.</TableHead>
              <TableHead className="whitespace-nowrap">Agent Name</TableHead>
              <TableHead className="whitespace-nowrap">Mobile</TableHead>
              <TableHead className="min-w-[10rem]">Email</TableHead>
              <TableHead className="whitespace-nowrap">Commission Rate %</TableHead>
              <TableHead className="w-[1%] whitespace-nowrap text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <InlineLoader size={20} />
                    <span>Loading agents…</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                  No agents found. Add one or adjust your search.
                </TableCell>
              </TableRow>
            ) : (
              data.map((a, i) => (
                <TableRow key={a.id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell>{a.mobile}</TableCell>
                  <TableCell className="max-w-[14rem] truncate text-sm">{a.email}</TableCell>
                  <TableCell>{a.commissionRate}</TableCell>
                  <TableCell className="text-center">
                    {loadingId === a.id ? (
                      <div className="flex items-center justify-center py-1">
                        <InlineLoader size={16} />
                      </div>
                    ) : (
                      <div className="flex justify-center">
                        <TableRowActions
                          compact={narrowViewport}
                          onView={() => onView?.(a)}
                          onEdit={() => onEdit?.(a)}
                          onDelete={() => onDelete?.(a)}
                          deleteTitle="Delete agent"
                          deleteDescription={`Are you sure you want to delete ${a.name}? This cannot be undone.`}
                          deleteLoading={loadingId === a.id}
                          editDisabled={loadingId === a.id}
                        />
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
