"use client"

import { Table, Tag } from "antd"
import { TableRowActions } from "@/components/shared/table-row-actions"
import { Eye } from "lucide-react"

interface AirticketRefundTableProps {
  data: any[]
  loading: boolean
  onDelete: (id: string) => void
  onView?: (record: any) => void
  pagination: any
}

export default function AirticketRefundTable({ data, loading, onDelete, onView, pagination }: AirticketRefundTableProps) {
  const columns = [
    {
      title: "SL.",
      key: "sl",
      width: 60,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: "Refund Date",
      dataIndex: "refundDate",
      key: "refundDate",
      render: (date: string) => date ? new Date(date).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric"
      }) : "-",
    },
    {
      title: "Voucher No",
      dataIndex: "voucherNo",
      key: "voucherNo",
      render: (v: string) => <span className="font-medium text-blue-600">{v}</span>
    },
    {
      title: "Invoice No",
      dataIndex: "invoiceNo",
      key: "invoiceNo",
    },
    {
      title: "Client",
      dataIndex: "clientName",
      key: "clientName",
    },
    {
      title: "Refund charge",
      dataIndex: "clientTotalCharge",
      key: "clientTotalCharge",
      render: (amount: number) => amount?.toLocaleString() || 0,
    },
    {
      title: "Refund profit",
      dataIndex: "refundProfit",
      key: "refundProfit",
      render: (amount: number) => amount?.toLocaleString() || 0,
    },
    {
      title: "Type",
      dataIndex: "clientRefundType",
      key: "clientRefundType",
      render: (type: string) => (
        <Tag color={type === "MONEY_RETURN" ? "blue" : "orange"}>
          {type?.replace("_", " ")}
        </Tag>
      ),
    },
    {
      title: "Note",
      dataIndex: "note",
      key: "note",
      ellipsis: true,
    },
    {
      title: "Action",
      key: "action",
      width: 200,
      render: (_: any, record: any) => (
        <TableRowActions
          onView={() => onView?.(record)}
          onDelete={() => onDelete(record.id)}
          deleteTitle="Delete Refund"
          deleteDescription="Are you sure you want to delete this airticket refund?"
        />
      ),
    },
  ]

  const expandedRowRender = (record: any) => {
    return (
      <div className="bg-gray-50 p-4 rounded-md border border-gray-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div>
          <h4 className="font-semibold text-gray-700 mb-2 border-b pb-1">Vendor Information</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Name:</span>
              <span className="font-medium">{record.vendorName || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Return Amount:</span>
              <span className="font-medium">{record.vendorReturnAmount?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total Charge:</span>
              <span className="font-medium text-red-500">{record.vendorTotalCharge?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Refund Type:</span>
              <Tag color="cyan" className="mr-0">{record.vendorRefundType?.replace("_", " ")}</Tag>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-gray-700 mb-2 border-b pb-1">Ticket Details</h4>
          <div className="space-y-2 max-h-[150px] overflow-y-auto">
            {record.tickets?.map((t: any, i: number) => (
              <div key={i} className="text-xs bg-white p-2 rounded border border-gray-200">
                <div className="font-medium text-blue-600">{t.pnr} - {t.paxName}</div>
                <div className="grid grid-cols-2 gap-x-2 mt-1">
                  <span className="text-gray-500">Sell: {t.sellPrice?.toLocaleString()}</span>
                  <span className="text-gray-500">Pur: {t.purchasePrice?.toLocaleString()}</span>
                  <span className="text-gray-500">Cl. Chg: {t.refundChargeFromClient?.toLocaleString()}</span>
                  <span className="text-gray-500">V. Chg: {t.refundChargeTakenByVendor?.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-gray-700 mb-2 border-b pb-1">Profit Summary</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Total Client Charge:</span>
              <span className="font-medium">{record.clientTotalCharge?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total Vendor Charge:</span>
              <span className="font-medium">{record.vendorTotalCharge?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between pt-1 border-t mt-1">
              <span className="font-semibold">Net Profit:</span>
              <span className="font-bold text-green-600">
                {((record.clientTotalCharge || 0) - (record.vendorTotalCharge || 0)).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} items`,
        }}
        expandable={{
          expandedRowRender,
          defaultExpandAllRows: false,
        }}
        className="refund-table"
      />
      <style jsx global>{`
        .refund-table .ant-table-thead > tr > th {
          background-color: #f8fafc;
          color: #475569;
          font-weight: 600;
        }
      `}</style>
    </div>
  )
}
