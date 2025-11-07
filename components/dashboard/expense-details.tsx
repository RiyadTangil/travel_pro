"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

const dailyExpenseData = [
  { name: "Mon", amount: 2400 },
  { name: "Tue", amount: 1398 },
  { name: "Wed", amount: 9800 },
  { name: "Thu", amount: 3908 },
  { name: "Fri", amount: 4800 },
  { name: "Sat", amount: 3800 },
  { name: "Sun", amount: 4300 },
];

const monthlyExpenseData = [
  { name: "Jan", amount: 24000 },
  { name: "Feb", amount: 13980 },
  { name: "Mar", amount: 98000 },
  { name: "Apr", amount: 39080 },
  { name: "May", amount: 48000 },
  { name: "Jun", amount: 38000 },
];

const yearlyExpenseData = [
  { name: "2020", amount: 240000 },
  { name: "2021", amount: 139800 },
  { name: "2022", amount: 980000 },
  { name: "2023", amount: 390800 },
  { name: "2024", amount: 480000 },
];

const expenseCategories = [
  { category: "Office Rent", amount: "25,000", percentage: "35%" },
  { category: "Utilities", amount: "8,500", percentage: "12%" },
  { category: "Marketing", amount: "15,000", percentage: "21%" },
  { category: "Travel", amount: "12,000", percentage: "17%" },
  { category: "Others", amount: "10,500", percentage: "15%" },
];

export function ExpenseDetails() {
  const [activeTab, setActiveTab] = useState("daily");

  const getChartData = () => {
    switch (activeTab) {
      case "monthly":
        return monthlyExpenseData;
      case "yearly":
        return yearlyExpenseData;
      default:
        return dailyExpenseData;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-medium">Expense Details</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="daily" className="text-sm">DAILY</TabsTrigger>
            <TabsTrigger value="monthly" className="text-sm">MONTHLY</TabsTrigger>
            <TabsTrigger value="yearly" className="text-sm">YEARLY</TabsTrigger>
          </TabsList>
          
          <TabsContent value="daily">
            <div className="space-y-6">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Bar dataKey="amount" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">Expense Categories</h4>
                {expenseCategories.map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">{item.category}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{item.amount}</span>
                      <span className="text-xs text-gray-500">({item.percentage})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="monthly">
            <div className="space-y-6">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Bar dataKey="amount" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">Expense Categories</h4>
                {expenseCategories.map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">{item.category}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{item.amount}</span>
                      <span className="text-xs text-gray-500">({item.percentage})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="yearly">
            <div className="space-y-6">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Bar dataKey="amount" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">Expense Categories</h4>
                {expenseCategories.map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">{item.category}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{item.amount}</span>
                      <span className="text-xs text-gray-500">({item.percentage})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}