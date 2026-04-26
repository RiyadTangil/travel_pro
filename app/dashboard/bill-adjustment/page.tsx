"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { PageWrapper } from "@/components/shared/page-wrapper"
import { Card, CardContent } from "@/components/ui/card"
import { Table, Tag, Select as AntSelect } from "antd"
import type { ColumnsType } from "antd/es/table"
import FilterToolbar from "@/components/shared/filter-toolbar"
import { TableRowActions } from "@/components/shared/table-row-actions"
import BillAdjustmentDrawer, { BillAdjustmentType } from "@/components/bill-adjustment/BillAdjustmentDrawer"
import axios from "axios"
import { useSession } from "next-auth/react"

interface BillAdjustmentRow {
  id: string
  date: string
  name: string
  type: BillAdjustmentType
  transactionType: "DEBIT" | "CREDIT"
  amount: number
  note: string
}

const NARROW_MAX = 768

export default function BillAdjustmentPage() {
  const { data: session } = useSession()
  const companyId = session?.user?.companyId
  const [activeTab, setActiveTab] = useState<BillAdjustmentType>("Account")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<BillAdjustmentRow[]>([])
  const [filterValue, setFilterValue] = useState("all")
  const [total, setTotal] = useState(0)
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

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get("/api/bill-adjustment", {
        params: { page, pageSize },
        headers: { "x-company-id": companyId ?? "" },
      })
      const items = res.data.items || []
      setRows(
        items.map((i: any) => ({
          id: i._id,
          date: i.date,
          name: i.name,
          type: i.type,
          transactionType: i.transactionType,
          amount: i.amount,
          note: i.note,
        }))
      )
      setTotal(res.data.pagination?.total || 0)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, companyId])

  useEffect(() => {
    if (session) void load()
  }, [load, session])

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await axios.delete(`/api/bill-adjustment/${id}`, {
          headers: { "x-company-id": companyId ?? "" },
        })
        await load()
      } catch (e) {
        console.error(e)
      }
    },
    [companyId, load]
  )

  const columns: ColumnsType<BillAdjustmentRow> = useMemo(
    () => [
      {
        title: "SL.",
        key: "sl",
        width: 56,
        align: "center",
        render: (_: unknown, __: BillAdjustmentRow, index: number) => (page - 1) * pageSize + index + 1,
      },
      {
        title: "Date",
        dataIndex: "date",
        key: "date",
        width: 120,
        render: (date: string) =>
          new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      },
      {
        title: "Name",
        key: "name",
        width: 200,
        render: (_: unknown, r: BillAdjustmentRow) => (
          <div className="flex min-w-0 items-center justify-between gap-2">
            <span className="min-w-0 truncate font-medium">{r.name}</span>
            <span className="shrink-0 text-xs text-gray-400">({r.type})</span>
          </div>
        ),
      },
      {
        title: "Transaction Type",
        dataIndex: "transactionType",
        key: "transactionType",
        width: 130,
        render: (type: string) => (
          <Tag color={type === "DEBIT" ? "red" : "green"} className="font-bold">
            {type}
          </Tag>
        ),
      },
      {
        title: "Amount",
        dataIndex: "amount",
        key: "amount",
        width: 110,
        align: "right",
        render: (val: number) => val.toLocaleString(),
      },
      {
        title: "Note",
        dataIndex: "note",
        key: "note",
        ellipsis: true,
        width: 160,
      },
      {
        title: "Action",
        key: "action",
        fixed: "right",
        width: narrowViewport ? 64 : 120,
        align: narrowViewport ? "center" : undefined,
        render: (_: unknown, r: BillAdjustmentRow) => (
          <TableRowActions
            compact={narrowViewport}
            showView={false}
            onDelete={() => handleDelete(r.id)}
            deleteTitle="Delete Bill Adjustment"
            deleteDescription="Are you sure you want to delete this adjustment? This will also reverse the balance changes."
          />
        ),
      },
    ],
    [page, pageSize, narrowViewport, handleDelete]
  )

  const tabs = [
    { key: "Account", label: "Accounts" },
    { key: "Client", label: "Clients" },
    { key: "Vendor", label: "Vendors" },
    { key: "Combined", label: "Combined" },
  ]

  const onTabClick = (key: BillAdjustmentType) => {
    setActiveTab(key)
    setDrawerOpen(true)
  }

  const handleSubmit = async (values: any) => {
    try {
      await axios.post("/api/bill-adjustment", values, {
        headers: { "x-company-id": companyId ?? "" },
      })
      void load()
      return true
    } catch (e) {
      console.error(e)
      return false
    }
  }

  const filteredRows = rows.filter((r) => filterValue === "all" || r.type === filterValue)

  return (
    <PageWrapper breadcrumbs={[{ label: "Bill Adjustment" }]}>
      <div className="mx-4 mb-4 min-w-0 space-y-4">
        <FilterToolbar
          showRefresh
          onRefresh={() => void load()}
          className="flex-1 min-w-0"
          filterExtras={
            <div className="w-[min(18rem,calc(100vw-6rem))] shrink-0 sm:w-64">
              <AntSelect
                value={filterValue}
                onChange={setFilterValue}
                className="min-w-0 w-full"
                popupMatchSelectWidth={false}
                options={[
                  { label: "Accounts", value: "Account" },
                  { label: "Clients", value: "Client" },
                  { label: "Vendors", value: "Vendor" },
                  { label: "Combined", value: "Combined" },
                  { label: "All", value: "all" },
                ]}
              />
            </div>
          }
        >
          <div className="flex max-w-full min-w-0 overflow-x-auto rounded-md border border-gray-200 bg-white [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] shadow-sm">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => onTabClick(tab.key as BillAdjustmentType)}
                className={`shrink-0 whitespace-nowrap border-r border-gray-200 px-4 py-2 text-sm font-medium transition-colors last:border-r-0 sm:px-6 ${
                  activeTab === tab.key ? "bg-sky-500 text-white" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </FilterToolbar>

        <Card className="border-none bg-transparent shadow-none">
          <CardContent className="p-0">
            <div className="min-w-0 overflow-hidden rounded-md border bg-white shadow-sm">
              <Table<BillAdjustmentRow>
                columns={columns}
                dataSource={filteredRows}
                rowKey="id"
                loading={loading}
                scroll={{ x: "max-content" }}
                pagination={{
                  current: page,
                  pageSize,
                  total,
                  onChange: (p, ps) => {
                    setPage(p)
                    setPageSize(ps ?? pageSize)
                  },
                  showSizeChanger: true,
                  showTotal: (t) => `Total ${t} items`,
                }}
                className="border-none"
                locale={{
                  emptyText: (
                    <div className="py-12 text-center text-gray-500">
                      <div className="mb-2 text-lg font-medium">No bill adjustments</div>
                      <p className="text-sm">Use the tabs above to create an adjustment</p>
                    </div>
                  ),
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <BillAdjustmentDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        type={activeTab}
        onSubmit={handleSubmit}
      />
    </PageWrapper>
  )
}
