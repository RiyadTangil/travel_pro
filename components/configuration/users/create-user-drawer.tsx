"use client"

import { useEffect } from "react"
import { Drawer, Form, Input, Select, Row, Col, Button, Space } from "antd"
import type { DrawerProps } from "antd"

const emailDomains = [
  { value: "@gmail.com", label: "@gmail.com" },
  { value: "@yahoo.com", label: "@yahoo.com" },
  { value: "@outlook.com", label: "@outlook.com" },
]

const mobilePrefixes = [
  { value: "+88", label: "+88" },
  { value: "+91", label: "+91" },
  { value: "+1", label: "+1" },
]

const userRoleOptions = [
  { value: "admin_role", label: "admin_role" },
  { value: "staff", label: "staff" },
  { value: "viewer", label: "viewer" },
]

export type CreateUserDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
} & Pick<DrawerProps, "className">

export function CreateUserDrawer({ open, onOpenChange, className }: CreateUserDrawerProps) {
  const [form] = Form.useForm()

  useEffect(() => {
    if (!open) {
      form.resetFields()
    }
  }, [open, form])

  return (
    <Drawer
      title={<span className="text-base font-semibold text-gray-900">Create a new user</span>}
      placement="right"
      width={560}
      onClose={() => onOpenChange(false)}
      open={open}
      destroyOnClose
      className={className}
      styles={{
        body: { paddingBottom: 8 },
      }}
      extra={
        <Button type="default" onClick={() => onOpenChange(false)} className="border-slate-300">
          Cancel
        </Button>
      }
      footer={
        <div className="flex justify-end border-t border-gray-100 pt-3 -mx-6 px-6 -mb-2 pb-1 bg-white">
          <Button
            type="primary"
            className="min-w-[100px] bg-sky-500 hover:bg-sky-600"
            onClick={() => onOpenChange(false)}
          >
            Submit
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" requiredMark className="mt-1" colon={false}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="firstName"
              label={<span className="text-gray-700">First Name</span>}
              rules={[{ required: true, message: "Enter first name" }]}
            >
              <Input placeholder="First name" size="large" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="lastName"
              label={<span className="text-gray-700">Last Name</span>}
              rules={[{ required: true, message: "Enter last name" }]}
            >
              <Input placeholder="Last name" size="large" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="userName"
              label={<span className="text-gray-700">User Name</span>}
              rules={[{ required: true, message: "Enter user name" }]}
            >
              <Input placeholder="User Name" size="large" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label={<span className="text-gray-700">Email</span>}
              required
              style={{ marginBottom: 0 }}
            >
              <Space.Compact style={{ width: "100%" }}>
                <Form.Item name="emailLocal" noStyle rules={[{ required: true, message: "Enter email" }]}>
                  <Input placeholder="Please enter email" size="large" style={{ width: "62%" }} />
                </Form.Item>
                <Form.Item name="emailDomain" noStyle initialValue="@gmail.com">
                  <Select options={emailDomains} size="large" style={{ width: "38%" }} />
                </Form.Item>
              </Space.Compact>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label={<span className="text-gray-700">Mobile</span>}>
              <Space.Compact style={{ width: "100%" }}>
                <Form.Item name="mobilePrefix" noStyle initialValue="+88">
                  <Select options={mobilePrefixes} size="large" style={{ width: "28%" }} />
                </Form.Item>
                <Form.Item name="mobile" noStyle>
                  <Input placeholder="Mobile" size="large" style={{ width: "72%" }} />
                </Form.Item>
              </Space.Compact>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="userRole"
              label={<span className="text-gray-700">User Role</span>}
              rules={[{ required: true, message: "Select user role" }]}
            >
              <Select placeholder="Select user role" options={userRoleOptions} size="large" allowClear />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="password"
              label={<span className="text-gray-700">Password</span>}
              rules={[{ required: true, message: "Enter password" }]}
            >
              <Input.Password placeholder="Enter password" size="large" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="confirmPassword"
              label={<span className="text-gray-700">Confirm Password</span>}
              rules={[{ required: true, message: "Confirm password" }]}
            >
              <Input.Password placeholder="Confirm user password" size="large" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Drawer>
  )
}
