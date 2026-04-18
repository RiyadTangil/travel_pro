"use client"

import { Table, Tag, Button as AntButton } from "antd"
import { Button } from "@/components/ui/button"
import type { MoneyReceipt } from "./types"
import { DeleteButton } from "@/components/shared/delete-button"

type Props = {
  rows: MoneyReceipt[]
  onView: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  loading?: boolean
  loadingRowId?: string | null
}

export default function ReceiptListTable({ rows, onView, onEdit, onDelete, loading = false, loadingRowId = null }: Props) {
  const columns = [
    {
      title: "SL.",
      key: "sl",
      width: 60,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: "Payment Date",
      dataIndex: "paymentDate",
      key: "paymentDate",
      render: (date: string) => new Date(date).toLocaleDateString("en-GB"),
    },
    {
      title: "Voucher No",
      dataIndex: "voucherNo",
      key: "voucherNo",
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: "Client Name",
      dataIndex: "clientName",
      key: "clientName",
      render: (text: string) => <span className="font-medium">{text}</span>,
    },
    {
      title: "Payment To",
      dataIndex: "paymentTo",
      key: "paymentTo",
      render: (text: string) => <Tag color="cyan">{text.toUpperCase()}</Tag>,
    },
    {
      title: "Payment Type",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
    },
    {
      title: "Account Name",
      dataIndex: "accountName",
      key: "accountName",
    },
    {
      title: "Manual Receipt No",
      dataIndex: "manualReceiptNo",
      key: "manualReceiptNo",
      render: (text: string) => text || "-",
    },
    {
      title: "Paid Amount",
      dataIndex: "paidAmount",
      key: "paidAmount",
      align: "right" as const,
      render: (amount: number) => <span className="font-semibold text-green-600">{amount.toLocaleString()}</span>,
    },
    {
      title: "Doc One",
      dataIndex: "docOneName",
      key: "docOneName",
      render: (text: string) => text || "-",
    },
    {
      title: "Doc Two",
      dataIndex: "docTwoName",
      key: "docTwoName",
      render: (text: string) => text || "-",
    },
    {
      title: "Action",
      key: "action",
      width: 220,
      render: (_: any, r: MoneyReceipt) => (
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onView(r.id)}
            disabled={loadingRowId === r.id}
          >
            View
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(r.id)}
            disabled={loadingRowId === r.id}
          >
            Edit
          </Button>
          <DeleteButton
            onDelete={() => onDelete(r.id)}
            isLoading={loadingRowId === r.id}
            title="Delete Money Receipt"
            description={`Are you sure you want to delete money receipt ${r.voucherNo}?`}
          />
        </div>
      ),
    },
  ]

  return (
    <div className="rounded-md border bg-white shadow-sm overflow-hidden">
      <Table
        columns={columns}
        dataSource={rows}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} items`,
        }}
        className="border-none"
      />
    </div>
  )
}
