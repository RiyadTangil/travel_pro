"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { InvoiceStats as IInvoiceStats } from "@/types/invoice"
import { 
  FileText, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle
} from "lucide-react"

interface InvoiceStatsProps {
  stats: IInvoiceStats
}

export function InvoiceStats({ stats }: InvoiceStatsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount).replace('BDT', '৳')
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-BD').format(num)
  }

  const getCollectionRate = () => {
    if (stats.totalSales === 0) return 0
    return ((stats.totalReceived / stats.totalSales) * 100).toFixed(1)
  }

  const statsCards = [
    {
      title: "Total Invoices",
      value: formatNumber(stats.totalInvoices),
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      description: "All invoices created"
    },
    {
      title: "Total Sales",
      value: formatCurrency(stats.totalSales),
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
      description: "Total invoice amount"
    },
    {
      title: "Amount Received",
      value: formatCurrency(stats.totalReceived),
      icon: TrendingUp,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      description: `${getCollectionRate()}% collection rate`
    },
    {
      title: "Amount Due",
      value: formatCurrency(stats.totalDue),
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-50",
      description: "Outstanding payments"
    }
  ]

  const statusCards = [
    {
      title: "Paid Invoices",
      value: formatNumber(stats.paidInvoices),
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
      percentage: stats.totalInvoices > 0 ? ((stats.paidInvoices / stats.totalInvoices) * 100).toFixed(1) : "0"
    },
    {
      title: "Partial Payments",
      value: formatNumber(stats.partialInvoices),
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      percentage: stats.totalInvoices > 0 ? ((stats.partialInvoices / stats.totalInvoices) * 100).toFixed(1) : "0"
    },
    {
      title: "Overdue Invoices",
      value: formatNumber(stats.overdueInvoices),
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
      percentage: stats.totalInvoices > 0 ? ((stats.overdueInvoices / stats.totalInvoices) * 100).toFixed(1) : "0"
    }
  ]

  return (
    <div className="space-y-6">
      {/* Financial Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stat.color} mb-1`}>
                {stat.value}
              </div>
              <p className="text-xs text-gray-500">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statusCards.map((stat, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className={`text-2xl font-bold ${stat.color}`}>
                  {stat.value}
                </div>
                <div className="text-sm text-gray-500">
                  {stat.percentage}%
                </div>
              </div>
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      stat.color.includes('green') ? 'bg-green-500' :
                      stat.color.includes('yellow') ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${stat.percentage}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}