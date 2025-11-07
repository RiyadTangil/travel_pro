"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { TrendingUp, DollarSign, Percent, ChevronRight, ChevronDown, ShoppingCart, CreditCard, TrendingDown } from "lucide-react";

const salesMetrics = [
  {
    id: "sales-amount",
    label: "Sales Amount",
    value: "0",
    icon: DollarSign,
    color: "text-blue-500",
    bgColor: "bg-blue-50",
  },
  {
    id: "collection-amount",
    label: "Collection Amount",
    value: "0",
    icon: TrendingUp,
    color: "text-green-500",
    bgColor: "bg-green-50",
  },
  {
    id: "discount-amount",
    label: "Discount Amount",
    value: "0",
    icon: Percent,
    color: "text-orange-500",
    bgColor: "bg-orange-50",
  },
];

const additionalMetrics = [
  {
    id: "purchase-amount",
    label: "Purchase Amount",
    value: "0",
    icon: ShoppingCart,
    color: "text-purple-500",
    bgColor: "bg-purple-50",
  },
  {
    id: "payment-amount",
    label: "Payment Amount",
    value: "0",
    icon: CreditCard,
    color: "text-indigo-500",
    bgColor: "bg-indigo-50",
  },
  {
    id: "profit-loss",
    label: "Profit & Loss",
    value: "0",
    icon: TrendingDown,
    color: "text-red-500",
    bgColor: "bg-red-50",
  },
];

export function SalesDataPanel() {
  const [activeTab, setActiveTab] = useState("daily");
  const [showMore, setShowMore] = useState(false);

  const renderMetrics = (metrics: typeof salesMetrics) => {
    return metrics.map((metric) => {
      const IconComponent = metric.icon;
      return (
        <div
          key={metric.id}
          className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${metric.bgColor}`}>
              <IconComponent className={`h-4 w-4 ${metric.color}`} />
            </div>
            <span className="text-sm font-medium text-gray-700">
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
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-medium">Sales Data</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="daily" className="text-sm">DAILY</TabsTrigger>
            <TabsTrigger value="monthly" className="text-sm">MONTHLY</TabsTrigger>
            <TabsTrigger value="yearly" className="text-sm">YEARLY</TabsTrigger>
          </TabsList>
          
          <TabsContent value="daily" className="space-y-4">
            <div className="space-y-3">
              {renderMetrics(salesMetrics)}
              {showMore && renderMetrics(additionalMetrics)}
            </div>
          </TabsContent>
          
          <TabsContent value="monthly" className="space-y-4">
            <div className="space-y-3">
              {renderMetrics(salesMetrics)}
              {showMore && renderMetrics(additionalMetrics)}
            </div>
          </TabsContent>
          
          <TabsContent value="yearly" className="space-y-4">
            <div className="space-y-3">
              {renderMetrics(salesMetrics)}
              {showMore && renderMetrics(additionalMetrics)}
            </div>
          </TabsContent>
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