"use client"

import { useMemo, useEffect, useState } from "react"
import Link from "next/link"
import { Table } from "antd"
import type { ColumnsType } from "antd/es/table"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { StatusSwitch } from "@/components/shared/status-switch"
import { cn } from "@/lib/utils"
import { Loader2, MoreVertical } from "lucide-react"

export type ClientsManagerRow = {
  id: string
  uniqueId?: string
  name: string
  type?: string
  phone?: string
  email?: string
  createdBy?: { id: string; name: string } | null
  presentBalance?: number
  active?: boolean
}

interface ClientsManagerTableProps {
  rows: ClientsManagerRow[]
  onView: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onToggleStatus?: (id: string, active: boolean) => void
  statusIds?: string[]
  editingIds?: string[]
  loading?: boolean
}

const NARROW_MAX = 768

function padSl(n: number) {
  return String(n).padStart(4, "0")
}

function ClientRowActions({
  record,
  narrow,
  editingIds,
  onView,
  onEdit,
  onDelete,
}: {
  record: ClientsManagerRow
  narrow: boolean
  editingIds: string[]
  onView: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}) {
  const editing = editingIds.includes(record.id)

  if (narrow) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0" aria-label="Client actions">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onSelect={() => onView(record.id)}>View</DropdownMenuItem>
          <DropdownMenuItem disabled={editing} onSelect={() => !editing && onEdit(record.id)}>
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => onDelete(record.id)}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <div className="flex justify-end gap-2">
      <Button size="sm" variant="outline" onClick={() => onView(record.id)} className="h-8 px-3 border-sky-200 hover:bg-sky-50 text-sky-700">
        View
      </Button>
      {editing ? (
        <Button size="sm" variant="secondary" disabled className="h-8 px-3">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Edit
        </Button>
      ) : (
        <Button size="sm" variant="secondary" onClick={() => onEdit(record.id)} className="h-8 px-3">
          Edit
        </Button>
      )}
      <Button size="sm" variant="destructive" onClick={() => onDelete(record.id)} className="h-8 bg-red-500 px-3 hover:bg-red-600">
        Delete
      </Button>
    </div>
  )
}

export default function ClientsManagerTable({
  rows,
  onView,
  onEdit,
  onDelete,
  onToggleStatus,
  statusIds = [],
  editingIds = [],
  loading = false,
}: ClientsManagerTableProps) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [narrowViewport, setNarrowViewport] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${NARROW_MAX}px)`)
    const apply = () => setNarrowViewport(mq.matches)
    apply()
    mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [])

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(rows.length / pageSize) || 1)
    if (page > maxPage) setPage(maxPage)
  }, [rows.length, pageSize, page])

  const columns: ColumnsType<ClientsManagerRow> = useMemo(
    () => [
      {
        title: "SL",
        key: "sl",
        width: 56,
        align: "center",
        render: (_: unknown, __: ClientsManagerRow, index: number) => (page - 1) * pageSize + index + 1,
      },
      {
        title: "Unique Id",
        key: "uniqueId",
        width: 100,
        render: (_: unknown, record: ClientsManagerRow, index: number) => (
          <span className="font-mono text-[12px] text-slate-500">
            {record.uniqueId ? String(record.uniqueId) : `CL-${padSl((page - 1) * pageSize + index + 1)}`}
          </span>
        ),
      },
      {
        title: "Name",
        key: "name",
        width: 180,
        render: (_: unknown, record: ClientsManagerRow) => (
          <Link
            href={`/dashboard/reports/client-ledger?clientId=${record.id}`}
            className="flex items-center gap-1 font-semibold text-blue-600 transition-colors hover:text-blue-800"
            title="View Client Ledger"
          >
            {record.name}
          </Link>
        ),
      },
      {
        title: "Client Type",
        key: "type",
        width: 120,
        render: (_: unknown, record: ClientsManagerRow) => (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
              record.type === "Corporate" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700",
            )}
          >
            {(record.type || "Individual").toString()}
          </span>
        ),
      },
      {
        title: "Mobile",
        dataIndex: "phone",
        key: "phone",
        width: 120,
        render: (v: string) => <span className="font-medium text-slate-600">{v || "—"}</span>,
      },
      {
        title: "Email",
        dataIndex: "email",
        key: "email",
        width: 160,
        render: (v: string) => <span className="text-slate-500">{v || "—"}</span>,
      },
      {
        title: "Present Balance",
        key: "presentBalance",
        width: 130,
        align: "right",
        render: (_: unknown, record: ClientsManagerRow) => {
          const bal = typeof record.presentBalance === "number" ? record.presentBalance : 0
          return (
            <span className={cn("font-bold", bal < 0 ? "text-red-600" : "text-green-600")}>
              {bal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )
        },
      },
      {
        title: "Created By",
        key: "createdBy",
        width: 120,
        render: (_: unknown, record: ClientsManagerRow) => (
          <span className="text-[12px] text-slate-500">{record.createdBy?.name || ""}</span>
        ),
      },
      {
        title: "Status",
        key: "active",
        width: 100,
        align: "center",
        render: (_: unknown, record: ClientsManagerRow) => (
          <div className="flex flex-col items-center gap-1">
            <StatusSwitch
              checked={!!record.active}
              onCheckedChange={(val) => onToggleStatus?.(record.id, val)}
              disabled={statusIds.includes(record.id)}
            />
            {statusIds.includes(record.id) && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
          </div>
        ),
      },
      {
        title: "Action",
        key: "action",
        ...(narrowViewport ? {} : { fixed: "right" as const }),
        width: narrowViewport ? 64 : 220,
        align: narrowViewport ? "center" : "right",
        render: (_: unknown, record: ClientsManagerRow) => (
          <ClientRowActions
            record={record}
            narrow={narrowViewport}
            editingIds={editingIds}
            onView={onView}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ),
      },
    ],
    [page, pageSize, narrowViewport, onView, onEdit, onDelete, onToggleStatus, statusIds, editingIds],
  )

  return (
    <Card className="border-none bg-transparent shadow-none">
      <CardContent className="p-0">
        <div className="min-w-0 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <Table<ClientsManagerRow>
            rowKey="id"
            columns={columns}
            dataSource={rows}
            loading={loading}
            scroll={{ x: "max-content" }}
            pagination={{
              current: page,
              pageSize,
              total: rows.length,
              showSizeChanger: true,
              showTotal: (t) => `Total ${t} items`,
              onChange: (p, ps) => {
                setPage(p)
                setPageSize(ps ?? pageSize)
              },
            }}
            locale={{
              emptyText: (
                <div className="py-12 text-center text-slate-500">
                  <p className="font-medium italic">No clients found matching your criteria</p>
                </div>
              ),
            }}
            className="border-none"
          />
        </div>
      </CardContent>
    </Card>
  )
}
