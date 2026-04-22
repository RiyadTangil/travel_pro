"use client"

import Image from "next/image"
import { Table, Tag } from "antd"
import type { ColumnsType } from "antd/es/table"
import { Button } from "@/components/ui/button"
import { TableRowActions } from "@/components/shared/table-row-actions"

export type Passport = {
  id: string
  createdDate: string
  passportNo: string
  paxType?: string
  name: string
  mobile: string
  dob?: string
  doi?: string
  doe?: string
  remaining?: string
  email?: string
  nid?: string
  clientId?: string
  scanCopyUrl?: string
  othersDocUrl?: string
  imageUrl?: string
  status: "PENDING" | "APPROVED" | "DELIVERED"
  note?: string
}

type Props = {
  data: Passport[]
  loading?: boolean
  loadingId?: string | null
  total?: number
  page?: number
  pageSize?: number
  onPageChange?: (page: number, pageSize: number) => void
  onChangeStatus?: (p: Passport) => void
  onEdit?: (p: Passport) => void
  onDelete?: (p: Passport) => void
}

const STATUS_COLOR: Record<string, string> = {
  PENDING:   "orange",
  APPROVED:  "green",
  DELIVERED: "blue",
}

function ThumbCell({ url, alt }: { url?: string; alt: string }) {
  if (!url) return <span className="text-muted-foreground text-xs">—</span>
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <Image src={url} width={36} height={36} alt={alt} className="rounded object-cover border" />
    </a>
  )
}

export function PassportTable({
  data,
  loading,
  loadingId,
  total = 0,
  page = 1,
  pageSize = 20,
  onPageChange,
  onChangeStatus,
  onEdit,
  onDelete,
}: Props) {
  const columns: ColumnsType<Passport> = [
    {
      title: "SL",
      key: "sl",
      width: 56,
      render: (_: unknown, __: Passport, index: number) => (page - 1) * pageSize + index + 1,
    },
    {
      title: "Created Date",
      dataIndex: "createdDate",
      key: "createdDate",
      width: 120,
    },
    {
      title: "Passport No",
      dataIndex: "passportNo",
      key: "passportNo",
      width: 120,
      render: (text: string) => <span className="font-medium text-blue-600">{text}</span>,
    },
    {
      title: "Pax Type",
      dataIndex: "paxType",
      key: "paxType",
      width: 90,
      render: (val: string) => val || "—",
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      width: 140,
    },
    {
      title: "Mobile",
      dataIndex: "mobile",
      key: "mobile",
      width: 120,
    },
    {
      title: "DOB",
      dataIndex: "dob",
      key: "dob",
      width: 110,
      render: (val: string) => val || "—",
    },
    {
      title: "Date of Issue",
      dataIndex: "doi",
      key: "doi",
      width: 110,
      render: (val: string) => val || "—",
    },
    {
      title: "Date of Expire",
      dataIndex: "doe",
      key: "doe",
      width: 115,
      render: (val: string) => val || "—",
    },
    {
      title: "Remaining",
      dataIndex: "remaining",
      key: "remaining",
      width: 100,
      render: (val: string) => {
        if (!val) return "—"
        const days = parseInt(val)
        const color = days < 0 ? "red" : days < 90 ? "orange" : "green"
        return <Tag color={color}>{val}</Tag>
      },
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: 160,
      render: (val: string) => val || "—",
    },
    {
      title: "Scan Copy",
      dataIndex: "scanCopyUrl",
      key: "scanCopyUrl",
      width: 90,
      align: "center" as const,
      render: (url: string) => <ThumbCell url={url} alt="Scan copy" />,
    },
    {
      title: "Others Doc",
      dataIndex: "othersDocUrl",
      key: "othersDocUrl",
      width: 90,
      align: "center" as const,
      render: (url: string) => <ThumbCell url={url} alt="Other doc" />,
    },
    {
      title: "Image",
      dataIndex: "imageUrl",
      key: "imageUrl",
      width: 80,
      align: "center" as const,
      render: (url: string) => <ThumbCell url={url} alt="Photo" />,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (val: string) => <Tag color={STATUS_COLOR[val] ?? "default"}>{val}</Tag>,
    },
    {
      title: "Note",
      dataIndex: "note",
      key: "note",
      ellipsis: true,
      width: 120,
      render: (val: string) => val || "—",
    },
    {
      title: "Action",
      key: "action",
      width: 270,
      fixed: "right" as const,
      render: (_: unknown, p: Passport) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            size="sm"
            className="bg-sky-500 hover:bg-sky-600 h-8 px-3 text-xs text-white"
            disabled={loadingId === p.id}
            onClick={() => onChangeStatus?.(p)}
          >
            Change Status
          </Button>
          <TableRowActions
            showView={false}
            onEdit={() => onEdit?.(p)}
            onDelete={() => onDelete?.(p)}
            editDisabled={loadingId === p.id}
            deleteLoading={loadingId === p.id}
          />
        </div>
      ),
    },
  ]

  /** Sum of column widths + action column — required for Ant Design horizontal scroll inside the viewport */
  const scrollX =
    56 +
    120 +
    120 +
    90 +
    140 +
    120 +
    110 +
    110 +
    115 +
    100 +
    160 +
    90 +
    90 +
    80 +
    100 +
    120 +
    270

  return (
    <div className="w-full min-w-0 max-w-full">
      <Table<Passport>
      rowKey="id"
      columns={columns}
      dataSource={data}
      loading={loading}
      scroll={{ x: scrollX }}

      className="border-none"
      locale={{ emptyText: loading ? "Loading…" : "No passports found" }}
      pagination={{
        current: page,
        pageSize,
        total,
        onChange: (p, ps) => onPageChange?.(p, ps),
        showSizeChanger: true,
        showTotal: (t) => `Total ${t} records`,
        pageSizeOptions: [10, 20, 50, 100],
      }}
    />
    </div>
  )
}
