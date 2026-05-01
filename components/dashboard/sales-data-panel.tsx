"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  DollarSign,
  Percent,
  ChevronRight,
  ChevronDown,
  ShoppingCart,
  CreditCard,
  TrendingDown,
  Loader2
} from "lucide-react";
import { useList } from "@/hooks/api/useList";
import { API, KEYS } from "@/lib/api/api-endpoints";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

interface DashboardMetrics {
  salesAmount: number;
  purchaseAmount: number;
  collectionAmount: number;
  paymentAmount: number;
  discountAmount: number;
  expenseAmount: number;
  profitLoss: number;
}

export function SalesDataPanel() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"daily" | "monthly" | "yearly">("daily");
  const [showMore, setShowMore] = useState(false);

  const { data: response, isLoading } = useList<DashboardMetrics>(
    KEYS.DASH.METRICS,
    API.DASH.METRICS,
    { period: activeTab }
  );

  const metrics = response?.data || {
    salesAmount: 0,
    purchaseAmount: 0,
    collectionAmount: 0,
    paymentAmount: 0,
    discountAmount: 0,
    expenseAmount: 0,
    profitLoss: 0,
  };

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const salesMetrics = [
    {
      id: "sales-amount",
      label: "Sales Amount",
      value: metrics.salesAmount.toLocaleString(),
      icon: DollarSign,
      color: "text-blue-500",
      bgColor: "bg-blue-50",
      link: `/dashboard/reports/daily_sales_report?daily=${todayStr}`
    },
    {
      id: "collection-amount",
      label: "Collection Amount",
      value: metrics.collectionAmount.toLocaleString(),
      icon: TrendingUp,
      color: "text-green-500",
      bgColor: "bg-green-50",
      link: `/dashboard/reports/sales-collection?daily=${todayStr}`
    },
    {
      id: "discount-amount",
      label: "Discount Amount",
      value: metrics.discountAmount.toLocaleString(),
      icon: Percent,
      color: "text-orange-500",
      bgColor: "bg-orange-50",
      link: `/dashboard/reports/sales-collection?daily=${todayStr}`
    },
  ];

  const additionalMetrics = [
    {
      id: "purchase-amount",
      label: "Purchase Amount",
      value: metrics.purchaseAmount.toLocaleString(),
      icon: ShoppingCart,
      color: "text-purple-500",
      bgColor: "bg-purple-50",
      link: `/dashboard/reports/vendor_wise_purchase_and_payment?daily=${todayStr}`
    },
    {
      id: "payment-amount",
      label: "Payment Amount",
      value: metrics.paymentAmount.toLocaleString(),
      icon: CreditCard,
      color: "text-indigo-500",
      bgColor: "bg-indigo-50",
      link: `/dashboard/vendors/payment`
    },
    {
      id: "profit-loss",
      label: "Profit & Loss",
      value: metrics.profitLoss.toLocaleString(),
      icon: metrics.profitLoss >= 0 ? TrendingUp : TrendingDown,
      color: metrics.profitLoss >= 0 ? "text-green-500" : "text-red-500",
      bgColor: metrics.profitLoss >= 0 ? "bg-green-50" : "bg-red-50",
      link: `/dashboard/reports/over_all_profit_loss?daily=${todayStr}`
    },
  ];

  const renderMetrics = (metricsList: typeof salesMetrics) => {
    return metricsList.map((metric) => {
      const IconComponent = metric.icon;
      return (
        <div
          key={metric.id}
          onClick={() => router.push(metric.link)}
          className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer relative"
        >
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${metric.bgColor}`}>
              <IconComponent className={`h-4 w-4 ${metric.color}`} />
            </div>
            <span className="text-sm font-medium text-gray-700 hover:text-sky-500 transition-colors">
              {metric.label}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-lg font-semibold text-gray-900">
              {metric.value}
            </span>
          </div>
        </div>
      );
    });
  };

  return (
    <Card className="w-full relative">
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center rounded-xl">
          <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
        </div>
      )}
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-medium">Sales Data</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="daily" className="text-sm">DAILY</TabsTrigger>
            <TabsTrigger value="monthly" className="text-sm">MONTHLY</TabsTrigger>
            <TabsTrigger value="yearly" className="text-sm">YEARLY</TabsTrigger>
          </TabsList>

          <div className="space-y-3">
            {renderMetrics(salesMetrics)}
            {showMore && renderMetrics(additionalMetrics)}
          </div>
        </Tabs>

        <div className="mt-6 pt-4 border-t border-gray-100">
          <Button
            variant="ghost"
            className="w-full justify-between text-sm text-gray-600 hover:text-gray-900"
            onClick={() => setShowMore(!showMore)}
          >
            {showMore ? "Show Less" : "Show More"}
            {showMore ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
