"use client"

import { Table } from "antd"
import type { ColumnsType } from "antd/es/table"
import type { AccountItem } from "./types"

interface BalanceStatusTableProps {
  title: string
  items: AccountItem[]
}

export default function BalanceStatusTable({ title, items }: BalanceStatusTableProps) {
  const total = items.reduce((sum, item) => sum + (item.lastBalance || 0), 0)

  const columns: ColumnsType<AccountItem> = [
    {
      title: "SL.",
      key: "sl",
      width: 64,
      render: (_v, _r, index) => index + 1,
    },
    { title: "Name", dataIndex: "name", key: "name", ellipsis: true },
    {
      title: "Branch",
      dataIndex: "branch",
      key: "branch",
      ellipsis: true,
      render: (v: string) => v || "—",
    },
    {
      title: "Bank Name",
      dataIndex: "bankName",
      key: "bankName",
      ellipsis: true,
      render: (v: string) => v || "—",
    },
    {
      title: "Account No.",
      dataIndex: "accountNo",
      key: "accountNo",
      ellipsis: true,
      render: (v: string) => v || "—",
    },
    {
      title: "Balance",
      dataIndex: "lastBalance",
      key: "lastBalance",
      align: "right",
      width: 140,
      render: (v: number) => <span className="font-medium tabular-nums">{Number(v ?? 0).toLocaleString()}</span>,
    },
  ]

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold mb-3 ml-1 text-gray-900">{title}</h3>
      <div className="bg-white rounded-md border shadow-sm overflow-hidden">
        <Table<AccountItem>
          columns={columns}
          dataSource={items}
          rowKey="id"
          pagination={false}
          size="middle"
          className="border-none"
          scroll={{ x: 720 }}
          locale={{
            emptyText: `No ${title.toLowerCase()} accounts in this group.`,
          }}
          summary={() =>
            items.length > 0 ? (
              <Table.Summary fixed>
                <Table.Summary.Row className="bg-gray-100 font-semibold">
                  <Table.Summary.Cell index={0} colSpan={5}>
                    Total — {title}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right">
                    <span className="tabular-nums">{total.toLocaleString()}</span>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            ) : null
          }
        />
      </div>
    </div>
  )
}
