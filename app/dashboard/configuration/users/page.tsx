"use client"

import { useMemo, useState, useEffect } from "react"
import { DateRange } from "react-day-picker"
import { Table, Tag, message, Popconfirm } from "antd"
import type { ColumnsType } from "antd/es/table"
import { UserPlus, Edit2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageWrapper } from "@/components/shared/page-wrapper"
import FilterToolbar from "@/components/shared/filter-toolbar"
import { TableRowActions } from "@/components/shared/table-row-actions"
import { CreateUserDrawer } from "@/components/configuration/users/create-user-drawer"
import { useSession } from "next-auth/react"
import axios from "axios"
import { usePermissions } from "@/hooks/use-permissions"

type UserRow = {
  id: string
  userRole: string
  fullName: string
  userName: string
  userEmail: string
  mobile: string
  roleId: string | null
  roleName: string
  createdAt: string
  status: "active" | "inactive"
}

export default function ConfigurationUsersPage() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<"add" | "edit">("add")
  const [viewUser, setViewUser] = useState<UserRow | null>(null)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [search, setSearch] = useState("")

  const fetchUsers = async () => {
    if (!session?.user?.companyId) return
    setLoading(true)
    try {
      const from = dateRange?.from?.toISOString().slice(0, 10)
      const to = dateRange?.to?.toISOString().slice(0, 10)

      const res = await axios.get("/api/configuration/users", {
        headers: { "x-company-id": session.user.companyId },
        params: { 
          pageSize: 100,
          search: search || undefined,
          fromDate: from,
          toDate: to,
        }
      })
      setUsers(res.data.items || [])
    } catch (error: any) {
      message.error(error.response?.data?.message || error.response?.data?.error || "Failed to fetch users")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [session?.user?.companyId, search, dateRange])

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`/api/configuration/users/${id}`, {
        headers: { "x-company-id": session?.user?.companyId }
      })
      message.success("User deleted successfully")
      setUsers((prev) => prev.filter((u) => u.id !== id))
    } catch (error: any) {
      message.error(error.response?.data?.message || error.response?.data?.error || "Failed to delete user")
    }
  }

  const openEditDrawer = (row: UserRow) => {
    setDrawerMode("edit")
    setViewUser(row)
    setDrawerOpen(true)
  }

  const filteredUsers = users;
  const columns: ColumnsType<UserRow> = [
    {
      title: "SL.",
      key: "sl",
      width: 56,
      align: "center",
      render: (_v, _r, index) => index + 1,
    },
    { title: "User Role", dataIndex: "userRole", key: "userRole", width: 130 },
    { title: "Full Name", dataIndex: "fullName", key: "fullName", width: 120, ellipsis: true },
    { title: "User Name", dataIndex: "userName", key: "userName", width: 120 },
    { title: "User Email", dataIndex: "userEmail", key: "userEmail", ellipsis: true, width: 100 },
    { title: "Mobile", dataIndex: "mobile", key: "mobile", width: 140 },
    { title: "Role Name", dataIndex: "roleName", key: "roleName", width: 130 },
    {
      title: "Created at",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 200,
      render: (v: string) => <span className="font-mono text-xs text-gray-700">{v.slice(0, 10)}</span>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: UserRow["status"]) =>
        status === "active" ? (
          <Tag color="success" className="m-0 font-medium border border-green-200 bg-green-50 text-green-700">
            Active
          </Tag>
        ) : (
          <Tag color="default">Inactive</Tag>
        ),
    },
    {
      title: "Action",
      key: "action",
      width: 150,
      fixed: "right",
      render: (_, record) => {
        const isSelf = record.id === session?.user?.id;
        return (
          <TableRowActions
            showView={false}
            editDisabled={isSelf}
            deleteDisabled={isSelf}
            onEdit={() => openEditDrawer(record)}
            onDelete={() => handleDelete(record.id)}
            deleteTitle="Delete user"
            deleteDescription="Are you sure to delete this user?"
          />
        )
      },
    },
  ]

  return (
    <PageWrapper breadcrumbs={[{ label: "Configuration", href: "/dashboard/configuration/companies" }, { label: "Users" }]}>
      <div className="space-y-4 px-4">
        <FilterToolbar
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search users, email, role..."
          showRefresh
          onRefresh={() => {
            setSearch("")
            setDateRange(undefined)
            fetchUsers()
          }}
          className="flex-1 min-w-0"
        >

            <Button
              onClick={() => {
                setDrawerMode("add")
                setViewUser(null)
                setDrawerOpen(true)
              }}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add New User
            </Button>
        </FilterToolbar>

        <div>

          <div className="bg-white rounded-md border shadow-sm overflow-hidden">
            <Table<UserRow>
              rowKey="id"
              columns={columns}
              dataSource={filteredUsers}
              pagination={false}
              scroll={{ x: "max-content" }}
              className="border-none"
              loading={loading}
            />
          </div>
        </div>

        <CreateUserDrawer 
          open={drawerOpen} 
          onOpenChange={setDrawerOpen} 
          mode={drawerMode}
          viewUser={viewUser}
          onUserSaved={(user) => {
            if (drawerMode === "edit") {
              setUsers((prev) => prev.map((u) => (u.id === user.id ? user : u)))
            } else {
              setUsers((prev) => [user, ...prev])
            }
          }}
        />
      </div>
    </PageWrapper>
  )
}
