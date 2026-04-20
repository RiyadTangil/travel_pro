"use client"

import { useState, useEffect, useCallback } from "react"
import { PageWrapper } from "@/components/shared/page-wrapper"
import { Card, CardContent } from "@/components/ui/card"
import { Table, Tag, Select as AntSelect } from "antd"
import { DeleteButton } from "@/components/shared/delete-button"
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

export default function BillAdjustmentPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<BillAdjustmentType>("Account")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<BillAdjustmentRow[]>([])
  const [filterValue, setFilterValue] = useState("all")
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get("/api/bill-adjustment", {
        params: { page, pageSize },
        headers: { "x-company-id": session?.user?.companyId }
      })
      const items = res.data.items || []
      setRows(items.map((i: any) => ({
        id: i._id,
        date: i.date,
        name: i.name,
        type: i.type,
        transactionType: i.transactionType,
        amount: i.amount,
        note: i.note
      })))
      setTotal(res.data.pagination?.total || 0)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, session])

  useEffect(() => {
    if (session) load()
  }, [load, session])

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`/api/bill-adjustment/${id}`, {
        headers: { "x-company-id": session?.user?.companyId }
      })
      await load()
    } catch (e) {
      console.error(e)
    }
  }

  const columns = [
    {
      title: "SL.",
      key: "sl",
      width: 60,
      render: (_: any, __: any, index: number) => (page - 1) * pageSize + index + 1,
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (date: string) => new Date(date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' }),
    },
    {
      title: "Name",
      key: "name",
      render: (_: any, r: BillAdjustmentRow) => (
        <div className="flex items-center justify-between">
          <span>{r.name}</span>
          <span className="text-gray-400 text-xs">({r.type})</span>
        </div>
      ),
    },
    {
      title: "Transaction Type",
      dataIndex: "transactionType",
      key: "transactionType",
      render: (type: string) => (
        <Tag color={type === "DEBIT" ? "red" : "green"} className="font-bold">
          {type}
        </Tag>
      )
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (val: number) => val.toLocaleString(),
    },
    {
      title: "Note",
      dataIndex: "note",
      key: "note",
    },
    {
      title: "Action",
      key: "action",
      width: 100,
      render: (_: any, r: BillAdjustmentRow) => (
        <DeleteButton
          onDelete={() => handleDelete(r.id)}
          title="Delete Bill Adjustment"
          description="Are you sure you want to delete this adjustment? This will also reverse the balance changes."
        />
      ),
    },
  ]

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
        headers: { "x-company-id": session?.user?.companyId }
      })
      load()
      return true
    } catch (e) {
      console.error(e)
      return false
    }
  }

  return (
    <PageWrapper breadcrumbs={[{ label: "Bill Adjustment" }]}>
      <div className="mx-4 mb-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex border rounded-md overflow-hidden bg-white">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => onTabClick(tab.key as BillAdjustmentType)}
                className={`px-6 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? "bg-sky-500 text-white"
                    : "text-gray-600 hover:bg-gray-50 border-r last:border-r-0"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <AntSelect
            value={filterValue}
            onChange={setFilterValue}
            className="w-64"
            options={[
              { label: "Accounts", value: "Account" },
              { label: "Clients", value: "Client" },
              { label: "Vendors", value: "Vendor" },
              { label: "Combined", value: "Combined" },
              { label: "All", value: "all" },
            ]}
          />
        </div>

        <Card className="border-none shadow-none bg-transparent">
          <CardContent className="p-0">
            <div className="bg-white rounded-md border shadow-sm overflow-hidden">
              <Table
                columns={columns}
                dataSource={rows.filter(r => filterValue === "all" || r.type === filterValue)}
                rowKey="id"
                loading={loading}
                pagination={{
                  current: page,
                  pageSize: pageSize,
                  total: total,
                  onChange: (p, ps) => {
                    setPage(p)
                    setPageSize(ps)
                  },
                  showSizeChanger: true,
                  showTotal: (total) => `Total ${total} items`,
                }}
                className="border-none"
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
