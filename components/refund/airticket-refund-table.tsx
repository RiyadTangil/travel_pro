"use client"

import { useMemo, useEffect, useState } from "react"
import { Table, Tag } from "antd"
import { TableRowActions } from "@/components/shared/table-row-actions"
import { format } from "date-fns"
import { Card, CardContent } from "@/components/ui/card"

interface AirticketRefundTableProps {
  data: any[]
  loading: boolean
  onDelete: (id: string) => void
  onView?: (record: any) => void
  pagination: {
    current: number
    pageSize: number
    total: number
    onChange: (page: number, pageSize: number) => void
  }
}

const NARROW_MAX = 768

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

export default function AirticketRefundTable({ data, loading, onDelete, onView, pagination }: AirticketRefundTableProps) {
  const [narrowViewport, setNarrowViewport] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${NARROW_MAX}px)`)
    const apply = () => setNarrowViewport(mq.matches)
    apply()
    mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [])

  const columns = useMemo(() => [
    {
      title: "SL.",
      key: "sl",
      width: 56,
      align: "center" as const,
      render: (_: any, __: any, index: number) => (pagination.current - 1) * pagination.pageSize + index + 1,
    },
    {
      title: "Refund Date",
      dataIndex: "refundDate",
      key: "refundDate",
      width: 120,
      render: (v: string) => formatDate(v),
    },
    {
      title: "Voucher No",
      dataIndex: "voucherNo",
      key: "voucherNo",
      width: 130,
      render: (v: string) => <span className="font-medium text-blue-600">{v}</span>
    },
    {
      title: "Invoice No",
      dataIndex: "invoiceNo",
      key: "invoiceNo",
      width: 130,
      render: (v: string) => <span className="font-medium text-gray-700">{v}</span>
    },
    {
      title: "Client",
      key: "client",
      width: 200,
      render: (_: any, record: any) => (
        <div className="space-y-1">
          <div className="font-medium text-gray-900">{record.clientName}</div>
          <div className="text-xs text-blue-600">{record.clientId?.phone || record.clientPhone}</div>
        </div>
      ),
    },
    {
      title: "Refund Charge",
      dataIndex: "clientTotalCharge",
      key: "clientTotalCharge",
      width: 120,
      align: "right" as const,
      render: (v: number) => <span className="font-medium">{formatCurrency(v)}</span>,
    },
    {
      title: "Refund Profit",
      dataIndex: "refundProfit",
      key: "refundProfit",
      width: 120,
      align: "right" as const,
      render: (v: number) => (
        <span className="font-bold text-green-600">
          {formatCurrency(v)}
        </span>
      ),
    },
    {
      title: "Type",
      dataIndex: "clientRefundType",
      key: "clientRefundType",
      width: 130,
      render: (type: string) => (
        <Tag color={type === "MONEY_RETURN" ? "blue" : "orange"}>
          {type?.replace("_", " ")}
        </Tag>
      ),
    },
    {
      title: "Note",
      dataIndex: "note",
      key: "note",
      width: 200,
      ellipsis: true,
    },
    {
      title: "Action",
      key: "action",
      fixed: "right" as const,
      width: narrowViewport ? 64 : 120,
      align: narrowViewport ? "center" : undefined,
      render: (_: any, record: any) => (
        <TableRowActions
          onView={() => onView?.(record)}
          onDelete={() => onDelete(record.id)}
          deleteTitle="Delete Refund"
          deleteDescription="Are you sure you want to delete this airticket refund?"
          compact={narrowViewport}
        />
      ),
    },
  ], [pagination.current, pagination.pageSize, narrowViewport, onView, onDelete])

  const expandedRowRender = (record: any) => {
    return (
      <div className="bg-gray-50 p-4 rounded-md border border-gray-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div>
          <h4 className="font-semibold text-gray-700 mb-2 border-b pb-1">Vendor Information</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Name:</span>
              <span className="font-medium">{record.vendorName || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Return Amount:</span>
              <span className="font-medium">{formatCurrency(record.vendorReturnAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total Charge:</span>
              <span className="font-medium text-red-500">{formatCurrency(record.vendorTotalCharge)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Refund Type:</span>
              <Tag color="cyan" className="mr-0">{record.vendorRefundType?.replace("_", " ")}</Tag>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-gray-700 mb-2 border-b pb-1">Ticket Details</h4>
          <div className="space-y-2 max-h-[150px] overflow-y-auto">
            {record.tickets?.map((t: any, i: number) => (
              <div key={i} className="text-xs bg-white p-2 rounded border border-gray-200">
                <div className="font-medium text-blue-600">{t.pnr} - {t.paxName}</div>
                <div className="grid grid-cols-2 gap-x-2 mt-1">
                  <span className="text-gray-500">Sell: {formatCurrency(t.sellPrice)}</span>
                  <span className="text-gray-500">Pur: {formatCurrency(t.purchasePrice)}</span>
                  <span className="text-gray-500">Cl. Chg: {formatCurrency(t.refundChargeFromClient)}</span>
                  <span className="text-gray-500">V. Chg: {formatCurrency(t.refundChargeTakenByVendor)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-gray-700 mb-2 border-b pb-1">Profit Summary</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Total Client Charge:</span>
              <span className="font-medium">{formatCurrency(record.clientTotalCharge)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total Vendor Charge:</span>
              <span className="font-medium">{formatCurrency(record.vendorTotalCharge)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t mt-1">
              <span className="font-semibold">Net Profit:</span>
              <span className="font-bold text-green-600">
                {formatCurrency((record.clientTotalCharge || 0) - (record.vendorTotalCharge || 0))}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardContent className="p-0">
        <div className="min-w-0 overflow-hidden rounded-md border bg-white shadow-sm">
          <Table
            columns={columns}
            dataSource={data}
            rowKey="id"
            loading={loading}
            scroll={{ x: "max-content" }}
            pagination={{
              ...pagination,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} items`,
              size: "small",
            }}
            expandable={{
              expandedRowRender,
              defaultExpandAllRows: false,
            }}
            size="middle"
            className="ant-table-responsive"
            locale={{
              emptyText: (
                <div className="py-12 text-center text-gray-500">
                  <div className="text-lg font-medium mb-2">No refunds found</div>
                </div>
              ),
            }}
          />
        </div>
      </CardContent>
      <style jsx global>{`
        .ant-table-responsive .ant-table-thead > tr > th {
          background-color: #f8fafc;
          color: #475569;
          font-weight: 600;
        }
      `}</style>
    </Card>
  )
}
