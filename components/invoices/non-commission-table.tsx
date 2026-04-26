"use client"

import { useMemo, useEffect, useState } from "react"
import { Table } from "antd"
import type { ColumnsType } from "antd/es/table"
import { Card, CardContent } from "@/components/ui/card"
import { InvoiceStatusBadge } from "./invoice-status-badge"
import { NonCommissionInvoiceActions } from "./non-commission-invoice-actions"
import { format } from "date-fns"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateString?: string) {
  if (!dateString) return "-"
  try {
    return format(new Date(dateString), "dd MMM yyyy")
  } catch {
    return dateString
  }
}

export interface NonCommissionTableProps {
  invoices: any[]
  loading?: boolean
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number, pageSize: number) => void
  onView?: (invoice: any) => void
  onEdit?: (invoice: any) => void
  onDelete?: (invoice: any) => void
  onMoneyReceipt?: (invoice: any) => void
  onPartialCost?: (invoice: any) => void
}

const NARROW_MAX = 768

export function NonCommissionTable({
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
  onPartialCost,
}: NonCommissionTableProps) {
  const [narrowViewport, setNarrowViewport] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${NARROW_MAX}px)`)
    const apply = () => setNarrowViewport(mq.matches)
    apply()
    mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [])

  const columns: ColumnsType<any> = useMemo(
    () => [
      {
        title: "SL.",
        key: "sl",
        width: 56,
        align: "center",
        render: (_: unknown, __: any, index: number) => (page - 1) * pageSize + index + 1,
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
        render: (_: unknown, record: any) => {
          const issueDates = Array.isArray(record.issueDates) ? record.issueDates : [record.issueDate]
          const uniqueDates = Array.from(new Set(issueDates.filter(Boolean))).map((d) =>
            formatDate(String(d))
          )
          return (
            <div className="flex flex-col gap-0.5 text-sm">
              {uniqueDates.length > 0 ? (
                uniqueDates.map((date, i) => (
                  <span key={i} className={i > 0 ? "pt-0.5 border-t border-gray-100" : ""}>
                    {date}
                  </span>
                ))
              ) : (
                <span className="text-gray-400">-</span>
              )}
            </div>
          )
        },
      },
      {
        title: "Client Name",
        key: "client",
        width: 180,
        render: (_: unknown, record: any) => (
          <div className="space-y-0.5">
            <div className="font-medium text-blue-600">{record.clientName}</div>
            <div className="text-xs text-blue-500">{record.clientPhone}</div>
          </div>
        ),
      },
      {
        title: "Sales Price",
        dataIndex: "salesPrice",
        key: "salesPrice",
        align: "right",
        width: 110,
        render: (v: number) => formatCurrency(v),
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
        align: "right",
        width: 110,
        render: (due: number, record: any) => (
          <div className={`font-medium ${due > 0 ? "text-red-600" : "text-green-600"}`}>
            {due > 0 ? formatCurrency(due) : <InvoiceStatusBadge status="paid" />}
          </div>
        ),
      },
      {
        title: "MR. No.",
        dataIndex: "mrNo",
        key: "mrNo",
        width: 100,
        render: (mr: string) => <span className="font-medium text-xs whitespace-pre-line">{mr}</span>,
      },
      { title: "Sales by", dataIndex: "salesBy", key: "salesBy", width: 110 },
      {
        title: "Action",
        key: "action",
        fixed: "right",
        width: narrowViewport ? 64 : 280,
        align: narrowViewport ? "center" : undefined,
        render: (_: unknown, record: any) => (
          <NonCommissionInvoiceActions
            invoice={record}
            onView={onView}
            onEdit={onEdit}
            onDelete={onDelete}
            onMoneyReceipt={onMoneyReceipt}
            onPartialCost={onPartialCost}
            compact={narrowViewport}
          />
        ),
      },
    ],
    [page, pageSize, narrowViewport, onView, onEdit, onDelete, onMoneyReceipt, onPartialCost]
  )

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardContent className="p-0">
        <div className="min-w-0 overflow-hidden rounded-md border bg-white shadow-sm">
          <Table<any>
            rowKey={(r) => r.id ?? r._id}
            columns={columns}
            dataSource={invoices}
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
                  <p className="text-sm">Create your first non-commission invoice to get started</p>
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
