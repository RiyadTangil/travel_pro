"use client"

import { useState, useEffect } from "react"
import { Table, Button as AntButton } from "antd"
import { format } from "date-fns"
import { Eye } from "lucide-react"

interface ClientReceiptsTabProps {
  clientId: string
}

export function ClientReceiptsTab({ clientId }: ClientReceiptsTabProps) {
  const [receipts, setReceipts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  })

  const fetchReceipts = async (page = 1, pageSize = 10) => {
    if (!clientId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/money-receipts?clientId=${clientId}&page=${page}&pageSize=${pageSize}`)
      const data = await res.json()
      if (res.ok) {
        setReceipts(data.items || [])
        setPagination({
          current: page,
          pageSize,
          total: data.pagination?.total || 0
        })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (clientId) {
      fetchReceipts(1, pagination.pageSize)
    }
  }, [clientId])

  const handleTableChange = (newPagination: any) => {
    fetchReceipts(newPagination.current, newPagination.pageSize)
  }

  const columns = [
    {
      title: "SL.",
      key: "sl",
      width: 60,
      render: (text: any, record: any, index: number) => 
        (pagination.current - 1) * pagination.pageSize + index + 1
    },
    {
      title: "Voucher No.",
      dataIndex: "receipt_vouchar_no",
      key: "receipt_vouchar_no",
      render: (text: string) => <span className="font-medium text-gray-800">{text}</span>
    },
    {
      title: "Date",
      dataIndex: "receipt_payment_date",
      key: "receipt_payment_date",
      render: (date: string) => date ? format(new Date(date), "dd MMM yyyy") : "-"
    },
    {
      title: "Total Amount",
      dataIndex: "receipt_total_amount",
      key: "receipt_total_amount",
      align: "right" as const,
      render: (val: number) => val?.toLocaleString() || "0"
    },
    {
      title: "Action",
      key: "action",
      align: "center" as const,
      width: 100,
      render: (_: any, record: any) => (
        <AntButton 
          type="primary" 
          size="small" 
          className="bg-sky-500 hover:bg-sky-600 border-none flex items-center justify-center gap-1 text-xs px-3"
          onClick={() => {
            // View action - logic to view receipt can be passed or implemented here
            // e.g., window.location.href = `/dashboard/money-receipts/${record.id}`
          }}
        >
          View
        </AntButton>
      )
    }
  ]

  return (
    <div className="bg-white p-4 rounded-md border">
      <Table 
        columns={columns} 
        dataSource={receipts} 
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} items`
        }}
        onChange={handleTableChange}
        scroll={{ x: 600 }}
        size="middle"
      />
    </div>
  )
}
