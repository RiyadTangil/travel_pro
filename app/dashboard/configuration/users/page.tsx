"use client"

import { useMemo, useState } from "react"
import { DateRange } from "react-day-picker"
import { Table, Tabs, Tag } from "antd"
import type { ColumnsType } from "antd/es/table"
import { UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageWrapper } from "@/components/shared/page-wrapper"
import FilterToolbar from "@/components/shared/filter-toolbar"
import { CreateUserDrawer } from "@/components/configuration/users/create-user-drawer"
import { RolesTab } from "@/components/configuration/users/roles-tab"

type UserRow = {
  id: string
  userRole: string
  fullName: string
  userName: string
  userEmail: string
  mobile: string
  roleName: string
  createdAt: string
  status: "active" | "inactive"
}

const MOCK_USERS: UserRow[] = [
  {
    id: "1",
    userRole: "SUPER_ADMIN",
    fullName: "—",
    userName: "tanvirair",
    userEmail: "tanvirairtravels1@gmail.com",
    mobile: "+880 1712 000000",
    roleName: "admin_role",
    createdAt: "2025-07-28T11:29:05.000Z",
    status: "active",
  },
]

function UsersTabContent() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [search, setSearch] = useState("")

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    const from = dateRange?.from?.toISOString().slice(0, 10)
    const to = dateRange?.to?.toISOString().slice(0, 10)

    return MOCK_USERS.filter((row) => {
      const hay = [row.userRole, row.fullName, row.userName, row.userEmail, row.mobile, row.roleName]
        .join(" ")
        .toLowerCase()
      const matchesSearch = !q || hay.includes(q)
      const d = row.createdAt.slice(0, 10)
      const inFrom = from ? d >= from : true
      const inTo = to ? d <= to : true
      return matchesSearch && inFrom && inTo
    })
  }, [search, dateRange])

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
      render: (v: string) => <span className="font-mono text-xs text-gray-700">{v}</span>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: UserRow["status"]) =>
        status === "active" ? (
          <Tag color="success" className="m-0 font-medium">
            Active
          </Tag>
        ) : (
          <Tag color="default">Inactive</Tag>
        ),
    },
    {
      title: "Action",
      key: "action",
      width: 120,
      fixed: "right",
      render: () => <span className="text-muted-foreground text-sm">—</span>,
    },
  ]

  return (
    <div className="space-y-4">
      <FilterToolbar
        showDateRange
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        showSearch
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search users, email, role..."
        showRefresh
        onRefresh={() => {
          setSearch("")
          setDateRange(undefined)
        }}
        className="flex-1 min-w-0"
      >
        <Button
          className="bg-sky-500 hover:bg-sky-600 text-white shrink-0"
          onClick={() => setDrawerOpen(true)}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add New User
        </Button>
      </FilterToolbar>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Users</h2>
        <div className="bg-white rounded-md border shadow-sm overflow-hidden">
          <Table<UserRow>
            rowKey="id"
            columns={columns}
            dataSource={filteredUsers}
            pagination={false}
            scroll={{ x: "max-content" }}
            className="border-none"
          />
        </div>
      </div>

      <CreateUserDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  )
}

export default function ConfigurationUsersPage() {
  return (
    <PageWrapper breadcrumbs={[{ label: "Configuration", href: "/dashboard/configuration/companies" }, { label: "Users" }]}>
      <div className="space-y-4 px-4">
        <Tabs
          defaultActiveKey="users"
          className="users-config-tabs"
          items={[
            {
              key: "users",
              label: "View Users",
              children: <UsersTabContent />,
            },
            {
              key: "roles",
              label: "View Roles",
              children: <RolesTab />,
            },
          ]}
        />
      </div>
    </PageWrapper>
  )
}
