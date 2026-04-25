"use client"

import { useMemo, useState } from "react"
import { DateRange } from "react-day-picker"
import { Table, Tag, Button as AntButton, Popconfirm } from "antd"
import type { ColumnsType } from "antd/es/table"
import { ShieldPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import FilterToolbar from "@/components/shared/filter-toolbar"
import { AddUserRoleDrawer, type UserRoleRow } from "./add-user-role-drawer"

const INITIAL_ROLES: UserRoleRow[] = [
  {
    id: "1",
    roleName: "tester",
    developer: false,
    status: "active",
    createdAt: "2025-07-28T10:00:00.000Z",
    permissionKeys: ["perm-dashboard", "perm-inv-other-view"],
    roleType: "standard",
  },
]

export function RolesTab() {
  const [roles, setRoles] = useState<UserRoleRow[]>(INITIAL_ROLES)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [search, setSearch] = useState("")

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<"add" | "view">("add")
  const [viewRole, setViewRole] = useState<UserRoleRow | null>(null)

  const filteredRoles = useMemo(() => {
    const q = search.trim().toLowerCase()
    const from = dateRange?.from?.toISOString().slice(0, 10)
    const to = dateRange?.to?.toISOString().slice(0, 10)
    return roles.filter((row) => {
      const hay = `${row.roleName} ${row.developer ? "yes" : "no"} ${row.roleType}`.toLowerCase()
      const matchesSearch = !q || hay.includes(q)
      const d = row.createdAt.slice(0, 10)
      const inFrom = from ? d >= from : true
      const inTo = to ? d <= to : true
      return matchesSearch && inFrom && inTo
    })
  }, [search, dateRange, roles])

  const openAddDrawer = () => {
    setDrawerMode("add")
    setViewRole(null)
    setDrawerOpen(true)
  }

  const openViewDrawer = (row: UserRoleRow) => {
    setDrawerMode("view")
    setViewRole(row)
    setDrawerOpen(true)
  }

  const handleDelete = (id: string) => {
    setRoles((prev) => prev.filter((r) => r.id !== id))
  }

  const handleAddRole = (payload: { roleName: string; roleType: string; permissionKeys: React.Key[] }) => {
    const developer = payload.roleType === "developer"
    const next: UserRoleRow = {
      id: `r-${Date.now()}`,
      roleName: payload.roleName,
      developer,
      status: "active",
      createdAt: new Date().toISOString(),
      permissionKeys: payload.permissionKeys,
      roleType: payload.roleType,
    }
    setRoles((prev) => [next, ...prev])
  }

  const columns: ColumnsType<UserRoleRow> = [
    {
      title: "SL.",
      key: "sl",
      width: 56,
      align: "center",
      render: (_v, _r, i) => i + 1,
    },
    { title: "Role Name", dataIndex: "roleName", key: "roleName", width: 160 },
    {
      title: "Developer",
      dataIndex: "developer",
      key: "developer",
      width: 100,
      render: (v: boolean) => (v ? "Yes" : "No"),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (status: UserRoleRow["status"]) =>
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
      width: 180,
      fixed: "right",
      render: (_: unknown, row: UserRoleRow) => (
        <div className="flex flex-wrap gap-2">
          <AntButton type="primary" size="small" className="bg-cyan-500 hover:bg-cyan-600 border-none" onClick={() => openViewDrawer(row)}>
            View
          </AntButton>
          <Popconfirm title="Delete this role?" description="This is UI-only; no API call." okText="Delete" cancelText="Cancel" onConfirm={() => handleDelete(row.id)}>
            <AntButton danger type="primary" size="small" className="bg-red-500 hover:bg-red-600 border-none">
              Delete
            </AntButton>
          </Popconfirm>
        </div>
      ),
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
        searchPlaceholder="Search roles..."
        showRefresh
        onRefresh={() => {
          setSearch("")
          setDateRange(undefined)
        }}
        className="flex-1 min-w-0"
      >
        <Button className="bg-sky-500 hover:bg-sky-600 text-white shrink-0" onClick={openAddDrawer}>
          <ShieldPlus className="h-4 w-4 mr-2" />
          Add user role
        </Button>
      </FilterToolbar>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">User Roles</h2>
        <div className="bg-white rounded-md border shadow-sm overflow-hidden">
          <Table<UserRoleRow>
            rowKey="id"
            columns={columns}
            dataSource={filteredRoles}
            pagination={false}
            scroll={{ x: "max-content" }}
            className="border-none"
          />
        </div>
      </div>

      <AddUserRoleDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={drawerMode}
        viewRole={viewRole}
        onAddRole={handleAddRole}
      />
    </div>
  )
}
