"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { InlineLoader } from "@/components/ui/loader"

type Agent = {
  id: string
  name: string
  mobile: string
  email: string
  commissionRate: number
}

type Props = {
  data: Agent[]
  loadingId?: string | null
  onView?: (agent: Agent) => void
  onEdit?: (agent: Agent) => void
  onDelete?: (agent: Agent) => void
}

export function AgentTable({ data, loadingId, onView, onEdit, onDelete }: Props) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="w-12">Sl.</TableHead>
            <TableHead>Agent Name</TableHead>
            <TableHead>Mobile</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Commision Rate %</TableHead>
            <TableHead className="text-center">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((a, i) => (
            <TableRow key={a.id}>
              <TableCell>{i + 1}</TableCell>
              <TableCell>{a.name}</TableCell>
              <TableCell>{a.mobile}</TableCell>
              <TableCell>{a.email}</TableCell>
              <TableCell>{a.commissionRate}</TableCell>
              <TableCell className="text-center">
                {loadingId === a.id ? (
                  <div className="flex items-center justify-center"><InlineLoader size={16} /></div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Button size="sm" variant="default" className="bg-sky-600" onClick={() => onView?.(a)}>View</Button>
                    <Button size="sm" variant="secondary" onClick={() => onEdit?.(a)}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => onDelete?.(a)}>Delete</Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}