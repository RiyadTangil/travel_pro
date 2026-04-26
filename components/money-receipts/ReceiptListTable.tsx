"use client"

import { useMemo, useEffect, useState } from "react"
import { Table, Tag } from "antd"
import type { ColumnsType } from "antd/es/table"
import { Card, CardContent } from "@/components/ui/card"
import { TableRowActions } from "@/components/shared/table-row-actions"
import type { MoneyReceipt } from "./types"

type Props = {
  rows: MoneyReceipt[]
  onView: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  loading?: boolean
  loadingRowId?: string | null
}

const NARROW_MAX = 768

export default function ReceiptListTable({
  rows,
  onView,
  onEdit,
  onDelete,
  loading = false,
  loadingRowId = null,
}: Props) {
  const [narrowViewport, setNarrowViewport] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${NARROW_MAX}px)`)
    const apply = () => setNarrowViewport(mq.matches)
    apply()
    mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [])

  const columns: ColumnsType<MoneyReceipt> = useMemo(
    () => [
      {
        title: "SL.",
        key: "sl",
        width: 56,
        align: "center",
        render: (_: unknown, __: MoneyReceipt, index: number) => index + 1,
      },
      {
        title: "Payment Date",
        dataIndex: "paymentDate",
        key: "paymentDate",
        width: 120,
        render: (date: string) => new Date(date).toLocaleDateString("en-GB"),
      },
      {
        title: "Voucher No",
        dataIndex: "voucherNo",
        key: "voucherNo",
        width: 120,
        render: (text: string) => <Tag color="blue">{text}</Tag>,
      },
      {
        title: "Client Name",
        dataIndex: "clientName",
        key: "clientName",
        width: 180,
        render: (text: string) => <span className="font-medium">{text}</span>,
      },
      {
        title: "Payment To",
        dataIndex: "paymentTo",
        key: "paymentTo",
        width: 120,
        render: (text: string) => <Tag color="cyan">{text.toUpperCase()}</Tag>,
      },
      {
        title: "Payment Type",
        dataIndex: "paymentMethod",
        key: "paymentMethod",
        width: 130,
      },
      {
        title: "Account Name",
        dataIndex: "accountName",
        key: "accountName",
        width: 160,
      },
      {
        title: "Manual Receipt No",
        dataIndex: "manualReceiptNo",
        key: "manualReceiptNo",
        width: 130,
        render: (text: string) => text || "-",
      },
      {
        title: "Paid Amount",
        dataIndex: "paidAmount",
        key: "paidAmount",
        align: "right",
        width: 110,
        render: (amount: number) => <span className="font-semibold text-green-600">{amount.toLocaleString()}</span>,
      },
      {
        title: "Doc One",
        dataIndex: "docOneName",
        key: "docOneName",
        width: 100,
        render: (text: string) => text || "-",
      },
      {
        title: "Doc Two",
        dataIndex: "docTwoName",
        key: "docTwoName",
        width: 100,
        render: (text: string) => text || "-",
      },
      {
        title: "Action",
        key: "action",
        fixed: "right",
        width: narrowViewport ? 64 : 220,
        align: narrowViewport ? "center" : undefined,
        render: (_: unknown, r: MoneyReceipt) => (
          <TableRowActions
            compact={narrowViewport}
            onView={() => onView(r.id)}
            onEdit={() => onEdit(r.id)}
            onDelete={() => onDelete(r.id)}
            deleteTitle="Delete Money Receipt"
            deleteDescription={`Are you sure you want to delete money receipt ${r.voucherNo}?`}
            deleteLoading={loadingRowId === r.id}
            editDisabled={loadingRowId === r.id}
          />
        ),
      },
    ],
    [narrowViewport, loadingRowId, onView, onEdit, onDelete]
  )

  return (
    <Card className="border-none bg-transparent shadow-none">
      <CardContent className="p-0">
        <div className="min-w-0 overflow-hidden rounded-md border bg-white shadow-sm">
          <Table<MoneyReceipt>
            columns={columns}
            dataSource={rows}
            rowKey="id"
            loading={loading}
            scroll={{ x: "max-content" }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} items`,
            }}
            className="border-none"
            locale={{
              emptyText: (
                <div className="py-12 text-center text-gray-500">
                  <div className="mb-2 text-lg font-medium">No receipts found</div>
                  <p className="text-sm">Create a money receipt or adjust filters</p>
                </div>
              ),
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}
