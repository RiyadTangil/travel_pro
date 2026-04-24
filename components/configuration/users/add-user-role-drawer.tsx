"use client"

import { useEffect, useState } from "react"
import { Drawer, Form, Input, Select, Button, Row, Col, Tree } from "antd"
import type { DrawerProps } from "antd"
import { PERMISSION_TREE_DATA } from "./permission-tree-data"

export type UserRoleRow = {
  id: string
  roleName: string
  developer: boolean
  status: "active" | "inactive"
  createdAt: string
  permissionKeys: React.Key[]
  roleType: string
}

const ROLE_TYPE_OPTIONS = [
  { value: "standard", label: "Standard" },
  { value: "developer", label: "Developer" },
  { value: "admin", label: "Administrator" },
]

export type AddUserRoleDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "add" | "view"
  /** When mode is "view", pass the row to display (read-only). */
  viewRole?: UserRoleRow | null
  /** Called after successful validation when mode is "add". */
  onAddRole?: (payload: { roleName: string; roleType: string; permissionKeys: React.Key[] }) => void
} & Pick<DrawerProps, "className">

export function AddUserRoleDrawer({
  open,
  onOpenChange,
  mode,
  viewRole,
  onAddRole,
  className,
}: AddUserRoleDrawerProps) {
  const [form] = Form.useForm()
  const [checkedKeys, setCheckedKeys] = useState<React.Key[]>([])
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>(["perm-all", "perm-inv-other"])

  const isView = mode === "view"

  useEffect(() => {
    if (!open) {
      form.resetFields()
      setCheckedKeys([])
      return
    }
    if (isView && viewRole) {
      form.setFieldsValue({
        roleName: viewRole.roleName,
        roleType: viewRole.roleType,
      })
      setCheckedKeys(viewRole.permissionKeys ?? [])
    } else if (!isView) {
      form.resetFields()
      setCheckedKeys([])
    }
  }, [open, isView, viewRole, form])

  const handleClose = () => {
    onOpenChange(false)
  }

  const handleAddRole = async () => {
    if (isView) return
    try {
      const values = await form.validateFields(["roleName", "roleType"])
      onAddRole?.({
        roleName: String(values.roleName).trim(),
        roleType: String(values.roleType),
        permissionKeys: checkedKeys,
      })
      form.resetFields()
      setCheckedKeys([])
      onOpenChange(false)
    } catch {
      // validation errors only
    }
  }

  const title = isView ? "View user role" : "Add user role"

  return (
    <Drawer
      title={<span className="text-base font-semibold text-gray-900">{title}</span>}
      placement="right"
      width={640}
      onClose={handleClose}
      open={open}
      destroyOnClose
      className={className}
      styles={{ body: { paddingBottom: 16 } }}
      extra={
        <Button type="default" onClick={handleClose} className="border-slate-300">
          Cancel
        </Button>
      }
    >
      <Form form={form} layout="vertical" requiredMark colon={false}>
        <Row gutter={12} align="bottom">
          <Col xs={24} sm={8}>
            <Form.Item
              name="roleName"
              label={<span className="text-gray-700">Role name</span>}
              rules={isView ? undefined : [{ required: true, message: "Enter role name" }]}
              className="mb-0"
            >
              <Input placeholder="Role name" size="large" readOnly={isView} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item
              name="roleType"
              label={<span className="text-gray-700">Role Type</span>}
              rules={isView ? undefined : [{ required: true, message: "Select an option" }]}
              className="mb-0"
            >
              <Select
                placeholder="Select a option"
                options={ROLE_TYPE_OPTIONS}
                size="large"
                allowClear={!isView}
                disabled={isView}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8} className="pb-1">
            {!isView ? (
              <Button
                type="primary"
                size="large"
                className="w-full bg-sky-500 hover:bg-sky-600 border-none"
                onClick={handleAddRole}
              >
                Add role
              </Button>
            ) : (
              <Button type="default" size="large" className="w-full" onClick={handleClose}>
                Close
              </Button>
            )}
          </Col>
        </Row>
      </Form>

      <div className="mt-6 border-t border-gray-100 pt-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Permissions</p>
        <div className="max-h-[min(52vh,520px)] overflow-y-auto rounded-md border border-gray-100 bg-gray-50/50 p-3">
          <Tree
            checkable
            disabled={isView}
            blockNode
            selectable={false}
            treeData={PERMISSION_TREE_DATA}
            checkedKeys={checkedKeys}
            expandedKeys={expandedKeys}
            onExpand={(keys) => setExpandedKeys(keys as React.Key[])}
            onCheck={(keys) => {
              if (isView) return
              const next = Array.isArray(keys) ? keys : keys.checked
              setCheckedKeys(next)
            }}
          />
        </div>
      </div>
    </Drawer>
  )
}
