
"use client"
import { useMemo, useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { DateRange } from "react-day-picker"
import { Table, Tag, message } from "antd"
import type { ColumnsType } from "antd/es/table"
import { ShieldPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import FilterToolbar from "@/components/shared/filter-toolbar"
import { TableRowActions } from "@/components/shared/table-row-actions"
import axios from "axios"
import { usePermissions } from "@/hooks/use-permissions"
import { compactPermissions } from "@/lib/permissions"
import { PageWrapper } from "@/components/shared/page-wrapper"
import { AddUserRoleDrawer, UserRoleRow } from "@/components/configuration/users/add-user-role-drawer"

export default function ConfigurationRolesPage() {
  const { data: session } = useSession()
  const [roles, setRoles] = useState<UserRoleRow[]>([])
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [search, setSearch] = useState("")

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<"add" | "view" | "edit">("add")
  const [viewRole, setViewRole] = useState<UserRoleRow | null>(null)

  const fetchRoles = async () => {
    if (!session?.user?.companyId) return
    setLoading(true)
    try {
      const res = await axios.get("/api/configuration/roles", {
        headers: { "x-company-id": session.user.companyId },
        params: { pageSize: 100 }
      })
      setRoles(res.data.items || [])
    } catch (error: any) {
      message.error(error.response?.data?.message || error.response?.data?.error || "Failed to fetch roles")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoles()
  }, [session?.user?.companyId])

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

  const openEditDrawer = (row: UserRoleRow) => {
    setDrawerMode("edit")
    setViewRole(row)
    setDrawerOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`/api/configuration/roles/${id}`, {
        headers: { "x-company-id": session?.user?.companyId }
      })
      message.success("Role deleted successfully")
      setRoles((prev) => prev.filter((r) => r.id !== id))
    } catch (error: any) {
      message.error(error.response?.data?.message || error.response?.data?.error || "Failed to delete role")
    }
  }

  const handleAddOrEditRole = async (payload: { roleName: string; roleType: string; permissionKeys: React.Key[] }) => {
    try {
      const compactedKeys = compactPermissions(payload.permissionKeys as string[])
      const apiPayload = { ...payload, permissionKeys: compactedKeys }

      if (drawerMode === "edit" && viewRole) {
        const res = await axios.put(`/api/configuration/roles/${viewRole.id}`, apiPayload, {
          headers: { "x-company-id": session?.user?.companyId }
        })
        message.success("Role updated successfully")
        setRoles((prev) => prev.map((r) => (r.id === viewRole.id ? res.data : r)))
      } else {
        const res = await axios.post("/api/configuration/roles", apiPayload, {
          headers: { "x-company-id": session?.user?.companyId }
        })
        message.success("Role added successfully")
        setRoles((prev) => [res.data, ...prev])
      }
      setDrawerOpen(false)
    } catch (error: any) {
      message.error(error.response?.data?.message || error.response?.data?.error || "Failed to save role")
      throw error // to prevent closing the drawer in drawer component if there's an error
    }
  }

  const { canCreate, canEdit, canDelete } = usePermissions("/dashboard/configuration/roles")

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
      width: 150,
      fixed: "right",
      render: (_: unknown, row: UserRoleRow) => (
        <TableRowActions
          showView={true}
          onView={() => openViewDrawer(row)}
          showEdit={canEdit}
          onEdit={() => openEditDrawer(row)}
          showDelete={canDelete}
          onDelete={() => handleDelete(row.id)}
          deleteTitle="Delete role"
          deleteDescription="Are you sure to delete this role?"
        />
      ),
    },
  ]

  return (
        <PageWrapper breadcrumbs={[{ label: "Configuration", href: "/dashboard/configuration/companies" }, { label: "Roles" }]}>
    <div className="space-y-4">
      <FilterToolbar
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        showSearch
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search roles..."
        onRefresh={() => {
          setSearch("")
          setDateRange(undefined)
          fetchRoles()
        }}
        className="flex-1 min-w-0"
      >
          <Button className="bg-sky-500 hover:bg-sky-600 text-white shrink-0" onClick={openAddDrawer}>
            <ShieldPlus className="h-4 w-4 mr-2" />
            Add user role
          </Button>
      </FilterToolbar>

      <div>

        <div className="bg-white rounded-md border shadow-sm overflow-hidden">
          <Table<UserRoleRow>
            rowKey="id"
            columns={columns}
            dataSource={filteredRoles}
            pagination={false}
            scroll={{ x: "max-content" }}
            className="border-none"
            loading={loading}
          />
        </div>
      </div>

      <AddUserRoleDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={drawerMode}
        viewRole={viewRole}
        onAddRole={handleAddOrEditRole}
      />
    </div>
    </PageWrapper>
  )
}

