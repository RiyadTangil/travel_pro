"use client"

import { useMemo } from "react"
import { Table } from "antd"
import type { ColumnsType } from "antd/es/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { InlineLoader } from "@/components/ui/loader"
import type { ProductItem } from "./product-modal"

interface ProductTableProps {
  items: ProductItem[]
  loading?: boolean
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number, pageSize: number) => void
  onEdit: (item: ProductItem) => void
  onDelete: (item: ProductItem) => void
  currentCompanyId?: string | null
  loadingRowId?: string | null
}

export default function ProductTable({
  items,
  loading = false,
  page,
  pageSize,
  total,
  onPageChange,
  onEdit,
  onDelete,
  currentCompanyId,
  loadingRowId,
}: ProductTableProps) {
  const columns: ColumnsType<ProductItem> = useMemo(
    () => [
      {
        title: "SL.",
        key: "sl",
        width: 56,
        align: "center",
        render: (_: unknown, __: ProductItem, index: number) => (page - 1) * pageSize + index + 1,
      },
      { title: "Product Name", dataIndex: "name", key: "name", ellipsis: true },
      { title: "Category", dataIndex: "categoryTitle", key: "categoryTitle", width: 160, ellipsis: true },
      {
        title: "Create Date",
        dataIndex: "createdAt",
        key: "createdAt",
        width: 130,
        render: (v: string | undefined) => (v ? new Date(v).toLocaleDateString() : "-"),
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        width: 110,
        render: (status: 1 | 0) =>
          status === 1 ? (
            <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>
          ) : (
            <Badge variant="outline" className="border-grey-300 text-gray-700">
              Inactive
            </Badge>
          ),
      },
      {
        title: "Action",
        key: "action",
        fixed: "right",
        width: 200,
        render: (_: unknown, item: ProductItem) => {
          const canEditDelete =
            currentCompanyId && item.companyId && String(item.companyId) === String(currentCompanyId)
          if (!canEditDelete) {
            return <span className="text-muted-foreground">—</span>
          }
          return (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                className="bg-blue-500 hover:bg-blue-600"
                onClick={() => onEdit(item)}
                disabled={loadingRowId === item.id}
              >
                {loadingRowId === item.id ? (
                  <span className="flex items-center gap-1">
                    <InlineLoader /> Edit
                  </span>
                ) : (
                  "Edit"
                )}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onDelete(item)}
                disabled={loadingRowId === item.id}
              >
                {loadingRowId === item.id ? (
                  <span className="flex items-center gap-1">
                    <InlineLoader /> Delete
                  </span>
                ) : (
                  "Delete"
                )}
              </Button>
            </div>
          )
        },
      },
    ],
    [page, pageSize, currentCompanyId, loadingRowId, onEdit, onDelete]
  )

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardContent className="p-0">
        <div className="bg-white rounded-md border shadow-sm overflow-hidden">
          <Table<ProductItem>
            rowKey="id"
            columns={columns}
            dataSource={items}
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
                <div className="py-12 text-center text-muted-foreground">
                  <div className="text-lg font-medium mb-2">No products found</div>
                  <p className="text-sm">Try adjusting search or date range</p>
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
