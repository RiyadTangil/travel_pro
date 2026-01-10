"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { AccountItem } from "./types"

interface BalanceStatusTableProps {
  title: string
  items: AccountItem[]
}

export default function BalanceStatusTable({ title, items }: BalanceStatusTableProps) {
  const total = items.reduce((sum, item) => sum + (item.lastBalance || 0), 0)

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold mb-4 ml-1">{title}</h3>
      <div className="bg-white rounded-md border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-100 hover:bg-gray-100 border-b">
              <TableHead className="w-12 font-bold text-gray-900 bg-gray-200/50">SL.</TableHead>
              <TableHead className="font-bold text-gray-900 bg-gray-200/50">Name</TableHead>
              <TableHead className="font-bold text-gray-900 bg-gray-200/50">Branch</TableHead>
              <TableHead className="font-bold text-gray-900 bg-gray-200/50">Bank Name</TableHead>
              <TableHead className="font-bold text-gray-900 bg-gray-200/50">Account No.</TableHead>
              <TableHead className="font-bold text-gray-900 bg-gray-200/50 text-right pr-4">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, idx) => (
              <TableRow key={item.id} className="hover:bg-gray-50 border-b last:border-0">
                <TableCell className="font-medium text-gray-600">{idx + 1}</TableCell>
                <TableCell className="text-gray-600">{item.name}</TableCell>
                <TableCell className="text-gray-600">{item.branch || ""}</TableCell>
                <TableCell className="text-gray-600">{item.bankName || ""}</TableCell>
                <TableCell className="text-gray-600">{item.accountNo || ""}</TableCell>
                <TableCell className="text-gray-800 font-medium text-right pr-4">{item.lastBalance.toLocaleString()}</TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                   No {title.toLowerCase()} accounts found
                </TableCell>
              </TableRow>
            )}
            <TableRow className="bg-gray-300 hover:bg-gray-300 font-bold border-t border-gray-400">
                <TableCell className="text-center text-gray-900">Total</TableCell>
                <TableCell colSpan={4}></TableCell>
                <TableCell className="text-right text-gray-900 pr-4">{total.toLocaleString()}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
