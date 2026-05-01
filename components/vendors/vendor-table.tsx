"use client"

import { Table, Tag } from "antd"
import Link from "next/link"
import { ArrowRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StatusSwitch } from "@/components/shared/status-switch"
import { TableRowActions } from "@/components/shared/table-row-actions"
import type { Vendor } from "./types"
import { cn } from "@/lib/utils"

type Props = {
  vendors: Vendor[]
  loading?: boolean
  onView: (v: Vendor) => void
  onEdit: (v: Vendor) => void
  onAddPayment: (v: Vendor) => void
  onDelete: (v: Vendor) => void
  onToggleStatus: (v: Vendor, active: boolean) => void
  statusBusyIds?: string[]
  deleteLoadingId?: string
}

export function VendorTable({
  vendors,
  loading,
  onView,
  onEdit,
  onAddPayment,
  onDelete,
  onToggleStatus,
  statusBusyIds = [],
  deleteLoadingId,
}: Props) {
  const columns = [
    {
      title: "SL",
      key: "sl",
      width: 60,
      align: "center" as const,
      render: (_: unknown, __: Vendor, index: number) => index + 1,
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      width: 200,
      render: (text: string, v: Vendor) => (
        <Link
          href={`/dashboard/reports/vendor-ledger?vendorId=${v.id}`}
          className="font-medium text-gray-900 hover:text-blue-600 hover:underline inline-flex items-center gap-1 group"
          title="View Vendor Ledger"
        >
          {text}
          <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
      ),
    },
    {
      title: "Mobile",
      dataIndex: "mobile",
      key: "mobile",
      width: 140,
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: 200,
      render: (email: string | undefined) => email || "—",
    },
    {
      title: "Present Balance",
      key: "presentBalance",
      width: 180,
      render: (_: unknown, v: Vendor) =>
        v.presentBalance.type === "due" ? (
          <span className="text-red-600 font-semibold">Due: {v.presentBalance.amount.toLocaleString()}</span>
        ) : (
          <span className={cn("font-semibold", v.presentBalance.type === "advance" ? "text-green-600" : "text-red-600")}>
            {v.presentBalance.type === "advance" ? "Adv" : "Due"}: {v.presentBalance.amount.toLocaleString()}
          </span>
        ),
    },
    {
      title: "Fixed Balance",
      dataIndex: "fixedBalance",
      key: "fixedBalance",
      width: 120,
      align: "right" as const,
      render: (fb: number | undefined) => (fb != null ? fb.toLocaleString() : "—"),
    },
    {
      title: "Status",
      key: "status",
      width: 100,
      align: "center" as const,
      render: (_: unknown, v: Vendor) => (
        <div className="flex flex-col items-center gap-1">
          <StatusSwitch
            checked={!!v.active}
            onCheckedChange={(val) => onToggleStatus(v, val)}
            disabled={statusBusyIds.includes(v.id)}
          />
          {statusBusyIds.includes(v.id) && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
        </div>
      ),
    },
    {
      title: "Action",
      key: "action",
      width: 220,
      fixed: "right" as const,
      align: "center" as const,
      render: (_: unknown, v: Vendor) => (
        <div className="flex items-center justify-center gap-2">
          <TableRowActions
            onView={() => onView(v)}
            onEdit={() => onEdit(v)}
            onDelete={() => onDelete(v)}
            deleteDisabled={v.presentBalance.amount !== 0}
            deleteLoading={deleteLoadingId === v.id}
            deleteTitle="Delete Vendor"
            deleteDescription={
              v.presentBalance.amount !== 0
                ? "Settle this vendor’s balance before deleting."
                : `Are you sure you want to delete "${v.name}"? This cannot be undone.`
            }
          />
        </div>
      ),
    },
  ]

  return (
    <Table<Vendor>
      rowKey={(r) => r.id}
      dataSource={vendors}
      loading={loading}
      pagination={{
        pageSize: 50,
        showSizeChanger: true,
        showTotal: (total) => `Total ${total} vendors`,
        size: "small",
      }}
      scroll={{ x: 1100 }}
      columns={columns}
      size="middle"
      className="ant-table-responsive"
      locale={{ emptyText: loading ? "Loading…" : "No vendors found" }}
    />
  )
}
