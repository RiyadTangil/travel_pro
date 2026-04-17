"use client"

import { useState, useEffect } from "react"
import { Table } from "antd"
import { format } from "date-fns"
import Link from "next/link"

interface ClientInvoicesTabProps {
  clientId: string
}

export function ClientInvoicesTab({ clientId }: ClientInvoicesTabProps) {
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  })

  const fetchInvoices = async (page = 1, pageSize = 10) => {
    if (!clientId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/invoices?clientId=${clientId}&page=${page}&pageSize=${pageSize}`)
      const data = await res.json()
      if (res.ok) {
        setInvoices(data.items || [])
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
      fetchInvoices(1, pagination.pageSize)
    }
  }, [clientId])

  const handleTableChange = (newPagination: any) => {
    fetchInvoices(newPagination.current, newPagination.pageSize)
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
      title: "Invoice No.",
      dataIndex: "invoiceNo",
      key: "invoiceNo",
      render: (text: string, record: any) => {
        const link = record.invoiceType === "visa" 
          ? `/dashboard/invoices-visa` 
          : record.invoiceType === "non_commission"
            ? `/dashboard/invoices-non-commission`
            : `/dashboard/invoices`
        return <Link href={link} className="text-blue-500 hover:underline">{text}</Link>
      }
    },
    {
      title: "Net Total",
      dataIndex: "salesPrice",
      key: "salesPrice",
      align: "right" as const,
      render: (val: number) => val?.toLocaleString() || "0"
    },
    {
      title: "Received",
      dataIndex: "receivedAmount",
      key: "receivedAmount",
      align: "right" as const,
      render: (val: number) => val?.toLocaleString() || "0"
    },
    {
      title: "Due Amount",
      key: "dueAmount",
      align: "center" as const,
      render: (_: any, record: any) => {
        if (record.dueAmount <= 0) {
          return <span className="px-2 py-1 text-xs font-bold text-green-600 bg-green-50 border border-green-200 rounded">PAID</span>
        }
        return <span className="text-red-600 font-medium">{record.dueAmount.toLocaleString()}</span>
      }
    },
    {
      title: "MR. No.",
      dataIndex: "mrNo",
      key: "mrNo",
      render: (text: string) => text || "-"
    },
    {
      title: "Sales by",
      dataIndex: "salesBy",
      key: "salesBy"
    },
    {
      title: "Sales Date",
      dataIndex: "salesDate",
      key: "salesDate",
      render: (date: string) => date ? format(new Date(date), "dd MMM yyyy") : "-"
    }
  ]

  return (
    <div className="bg-white p-4 rounded-md border">
      <Table 
        columns={columns} 
        dataSource={invoices} 
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} items`
        }}
        onChange={handleTableChange}
        scroll={{ x: 800 }}
        size="middle"
      />
    </div>
  )
}
