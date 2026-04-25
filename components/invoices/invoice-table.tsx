"use client"

import { useMemo, useEffect, useState } from "react"
import { Table } from "antd"
import type { ColumnsType } from "antd/es/table"
import { Card, CardContent } from "@/components/ui/card"
import { Invoice } from "@/types/invoice"
import { InvoiceActions } from "./invoice-actions"
import { InvoiceStatusBadge } from "./invoice-status-badge"
import { format } from "date-fns"

type Row = Invoice & { issueDate?: string; issueDates?: string[] }

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace("BDT", "৳")
}

function formatDate(dateString?: string) {
  if (!dateString) return "-"
  try {
    return format(new Date(dateString), "dd MMM yyyy")
  } catch {
    return dateString
  }
}

export interface InvoiceTableProps {
  invoices: Invoice[]
  loading?: boolean
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number, pageSize: number) => void
  onView?: (invoice: Invoice) => void
  onEdit?: (invoice: Invoice) => void
  onDelete?: (invoice: Invoice) => void
  onMoneyReceipt?: (invoice: Invoice) => void
  onAssignBy?: (invoice: Invoice) => void
}

const NARROW_MAX = 768

export function InvoiceTable({
  invoices,
  loading = false,
  page,
  pageSize,
  total,
  onPageChange,
  onView,
  onEdit,
  onDelete,
  onMoneyReceipt,
  onAssignBy,
}: InvoiceTableProps) {
  const [narrowViewport, setNarrowViewport] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${NARROW_MAX}px)`)
    const apply = () => setNarrowViewport(mq.matches)
    apply()
    mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [])

  const columns: ColumnsType<Row> = useMemo(
    () => [
      {
        title: "SL.",
        key: "sl",
        width: 56,
        align: "center",
        render: (_: unknown, __: Row, index: number) => (page - 1) * pageSize + index + 1,
      },
      { title: "Invoice", dataIndex: "invoiceNo", key: "invoiceNo", width: 120 },
      {
        title: "Sales Date",
        dataIndex: "salesDate",
        key: "salesDate",
        width: 120,
        render: (v: string) => formatDate(v),
      },
      {
        title: "Issue Date",
        key: "issueDate",
        width: 130,
        render: (_: unknown, record: Row) => (
          <div className="flex flex-col gap-0.5">
            {Array.isArray(record.issueDates) && record.issueDates.length > 0 ? (
              record.issueDates.map((date, i) => (
                <span key={i} className={i > 0 ? "pt-0.5 border-t border-gray-100" : ""}>
                  {formatDate(date)}
                </span>
              ))
            ) : (
              <span>{formatDate(record.issueDate)}</span>
            )}
          </div>
        ),
      },
      {
        title: "Client Name",
        key: "client",
        width: 180,
        render: (_: unknown, record: Row) => (
          <div className="space-y-1">
            <div className="font-medium text-gray-900">{record.clientName}</div>
            <div className="text-sm text-blue-600">{record.clientPhone}</div>
          </div>
        ),
      },
      {
        title: "Sales Price",
        dataIndex: "salesPrice",
        key: "salesPrice",
        align: "right",
        width: 110,
        render: (v: number) => <span className="font-medium">{formatCurrency(v)}</span>,
      },
      {
        title: "Rec Amount",
        dataIndex: "receivedAmount",
        key: "receivedAmount",
        align: "right",
        width: 110,
        render: (v: number) => formatCurrency(v),
      },
      {
        title: "Due Amount",
        dataIndex: "dueAmount",
        key: "dueAmount",
        align: "center",
        width: 120,
        render: (due: number) => (
          <div
            className={`mx-auto px-2 py-0.5 rounded-full text-[10px] font-bold text-center inline-block ${
              due > 0
                ? "bg-red-50 text-red-600 border border-red-100"
                : "bg-green-50 text-green-600 border border-green-100"
            }`}
          >
            {due > 0 ? formatCurrency(due) : "PAID"}
          </div>
        ),
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        width: 100,
        render: (s: Row["status"]) => <InvoiceStatusBadge status={s} />,
      },
      {
        title: "MR. No.",
        dataIndex: "mrNo",
        key: "mrNo",
        width: 100,
        render: (mr: string) => (
          <div className="flex flex-col gap-0.5 text-xs">
            {mr
              ? mr.split(",").map((x, i) => (
                  <span key={i} className={i > 0 ? "pt-0.5 border-t border-gray-100" : ""}>
                    {x.trim()}
                  </span>
                ))
              : "-"}
          </div>
        ),
      },
      {
        title: "Passport",
        dataIndex: "passportNo",
        key: "passportNo",
        width: 100,
        render: (pp: string) => (
          <div className="flex flex-col gap-0.5 text-[10px]">
            {pp
              ? pp.split(",").map((x, i) => (
                  <span key={i} className={i > 0 ? "pt-0.5 border-t border-gray-100" : ""}>
                    {x.trim()}
                  </span>
                ))
              : "-"}
          </div>
        ),
      },
      { title: "Sales by", dataIndex: "salesBy", key: "salesBy", width: 110 },
      {
        title: "Action",
        key: "action",
        fixed: "right",
        // ...(narrowViewport ? {} : { fixed: "right" as const }),
        width: narrowViewport ? 64 : 280,
        align: narrowViewport ? "center" : undefined,
        render: (_: unknown, record: Row) => (
          <InvoiceActions
            status={record.status}
            invoice={{ ...record, onAssignBy } as any}
            onView={onView}
            onEdit={onEdit}
            onDelete={onDelete}
            onMoneyReceipt={onMoneyReceipt}
            compact={narrowViewport}
          />
        ),
      },
    ],
    [page, pageSize, narrowViewport, onView, onEdit, onDelete, onMoneyReceipt, onAssignBy]
  )

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardContent className="p-0">
        <div className="min-w-0 overflow-hidden rounded-md border bg-white shadow-sm">
          <Table<Row>
            rowKey="id"
            columns={columns}
            dataSource={invoices as Row[]}
            loading={loading}
            scroll={{ x: "max-content" }}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              showTotal: (t) => `Total ${t} items`,
              onChange: (p, ps) => onPageChange(p, ps ?? pageSize),
            }}
            locale={{
              emptyText: (
                <div className="py-12 text-center text-gray-500">
                  <div className="text-lg font-medium mb-2">No invoices found</div>
                  <p className="text-sm">Create your first invoice to get started</p>
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
