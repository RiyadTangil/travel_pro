"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus } from "lucide-react"
import AccountModal from "@/components/accounts/account-modal"
import type { AccountItem } from "@/components/accounts/types"
import { InlineLoader } from "@/components/ui/loader"
import { PageWrapper } from "@/components/shared/page-wrapper"
import FilterToolbar from "@/components/shared/filter-toolbar"
import { DeleteButton } from "@/components/shared/delete-button"
import { Table } from "antd"

export default function AccountsPage() {
  const { data: session } = useSession()
  const [items, setItems] = useState<AccountItem[]>([])
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<AccountItem | null>(null)
  const [loadingRowId, setLoadingRowId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [loadingList, setLoadingList] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)

  const companyId = session?.user?.companyId ?? ""

  const loadItems = useCallback(async () => {
    setLoadingList(true)
    try {
      const params = new URLSearchParams()
      params.set("q", debouncedSearch)
      params.set("page", String(page))
      params.set("pageSize", String(pageSize))
      const res = await fetch(`/api/accounts?${params.toString()}`, {
        headers: { "x-company-id": companyId },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to load accounts")
      setItems(data.items || [])
      setTotal(Number(data.total ?? 0))
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingList(false)
    }
  }, [debouncedSearch, page, pageSize, companyId])

  useEffect(() => {
    const t = setTimeout(() => {
      const next = search.trim()
      setDebouncedSearch((prev) => {
        if (next !== prev) setPage(1)
        return next
      })
    }, 250)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    if (session) loadItems()
  }, [loadItems, session])

  const handleAddClick = () => {
    setEditing(null)
    setOpen(true)
  }

  const handleEdit = (item: AccountItem) => {
    setEditing(item)
    setOpen(true)
  }

  const onSubmit = async (payload: AccountItem) => {
    setSubmitting(true)
    try {
      if (editing) {
        const res = await fetch(`/api/accounts/${editing.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-company-id": companyId,
          },
          body: JSON.stringify({
            name: payload.name,
            type: payload.type,
            accountTypeId: payload.accountTypeId,
            accountNo: payload.accountNo,
            bankName: payload.bankName,
            routingNo: payload.routingNo,
            cardNo: payload.cardNo,
            branch: payload.branch,
            lastBalance: payload.lastBalance,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || "Update failed")
      } else {
        const res = await fetch(`/api/accounts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-company-id": companyId,
          },
          body: JSON.stringify({
            name: payload.name,
            type: payload.type,
            accountTypeId: payload.accountTypeId,
            accountNo: payload.accountNo,
            bankName: payload.bankName,
            routingNo: payload.routingNo,
            cardNo: payload.cardNo,
            branch: payload.branch,
            lastBalance: payload.lastBalance,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || "Create failed")
      }
      await loadItems()
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
      setOpen(false)
      setEditing(null)
    }
  }

  const deleteAccount = async (item: AccountItem) => {
    if (item.hasTrxn) return
    setLoadingRowId(item.id)
    try {
      const res = await fetch(`/api/accounts/${item.id}`, {
        method: "DELETE",
        headers: { "x-company-id": companyId },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Delete failed")
      await loadItems()
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingRowId(null)
    }
  }

  const columns = [
    {
      title: "SL.",
      key: "sl",
      width: 60,
      render: (_: unknown, __: AccountItem, index: number) => (page - 1) * pageSize + index + 1,
    },
    { title: "Name", dataIndex: "name", key: "name" },
    { title: "Account Type", dataIndex: "type", key: "type" },
    { title: "Account No", dataIndex: "accountNo", key: "accountNo", render: (v: string) => v || "—" },
    { title: "Bank Name", dataIndex: "bankName", key: "bankName", render: (v: string) => v || "—" },
    { title: "Routing No.", dataIndex: "routingNo", key: "routingNo", render: (v: string) => v || "—" },
    { title: "Card No", dataIndex: "cardNo", key: "cardNo", render: (v: string) => v || "—" },
    { title: "Branch", dataIndex: "branch", key: "branch", render: (v: string) => v || "—" },
    {
      title: "Last Balance",
      dataIndex: "lastBalance",
      key: "lastBalance",
      align: "right" as const,
      render: (v: number) => <span className="text-green-600 font-medium">{Number(v || 0).toLocaleString()}</span>,
    },
    {
      title: "Action",
      key: "action",
      width: 280,
      render: (_: unknown, r: AccountItem) => (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" className="bg-blue-500 hover:bg-blue-600" onClick={() => handleEdit(r)} disabled={loadingRowId === r.id}>
            {loadingRowId === r.id ? (
              <span className="flex items-center gap-1">
                <InlineLoader /> Edit
              </span>
            ) : (
              "Edit"
            )}
          </Button>
          <Button size="sm" variant="outline">
            Statement
          </Button>
          <DeleteButton
            onDelete={() => deleteAccount(r)}
            disabled={!!r.hasTrxn}
            isLoading={loadingRowId === r.id}
            title="Delete Account"
            description={`Are you sure you want to delete ${r.name}?`}
            className={r.hasTrxn ? "opacity-60" : ""}
            size="sm"
          />
        </div>
      ),
    },
  ]

  return (
    <PageWrapper breadcrumbs={[{ label: "Accounts" }]}>
      <div className="mx-4 mb-4 space-y-4">

          <FilterToolbar
            showSearch
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search accounts..."
            showRefresh
            onRefresh={loadItems}
            className="flex-1"
          >
            <Button className="bg-sky-500 hover:bg-sky-600 shrink-0" onClick={handleAddClick}>
              <Plus className="h-4 w-4 mr-2" /> Add Account
            </Button>
          </FilterToolbar>
        <Card className="border-none shadow-none bg-transparent">
          <CardContent className="p-0">
            <div className="bg-white rounded-md border shadow-sm overflow-hidden">
              <Table<AccountItem>
                columns={columns}
                dataSource={items}
                rowKey="id"
                loading={loadingList}
                pagination={{
                  current: page,
                  pageSize,
                  total,
                  showSizeChanger: true,
                  onChange: (p, ps) => {
                    setPage(p)
                    setPageSize(ps)
                  },
                  showTotal: (t) => `Total ${t} items`,
                }}
                className="border-none"
                scroll={{ x: 1100 }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <AccountModal
        open={open}
        onOpenChange={(v) => {
          setOpen(v)
          if (!v) setEditing(null)
        }}
        initialItem={editing}
        onSubmit={onSubmit}
        submitting={submitting}
      />

    </PageWrapper>
  )
}
