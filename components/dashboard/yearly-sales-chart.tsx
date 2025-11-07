"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, Download } from "lucide-react";

const chartData = [
  {
    quarter: "Q1",
    Sales: 0,
    Purchases: 0,
    Collection: 0,
    Profit: 0,
  },
  {
    quarter: "Q2",
    Sales: 0,
    Purchases: 0,
    Collection: 0,
    Profit: 0,
  },
  {
    quarter: "Q3",
    Sales: 8500,
    Purchases: 7500,
    Collection: 8000,
    Profit: 1000,
  },
  {
    quarter: "Q4",
    Sales: 8200,
    Purchases: 7200,
    Collection: 7800,
    Profit: 1000,
  },
];

export function YearlySalesChart() {
  const handleDownload = (format: string) => {
    // TODO: Implement actual download functionality
    console.log(`Downloading chart as ${format}`)
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">
            Yearly Sales Chart <span className="text-sm text-gray-500 font-normal">2025</span>
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleDownload('csv')}>
                <Download className="mr-2 h-4 w-4" />
                Download CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownload('png')}>
                <Download className="mr-2 h-4 w-4" />
                Download PNG
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownload('svg')}>
                <Download className="mr-2 h-4 w-4" />
                Download SVG
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-4">
            Financial Metrics by Quarter (2025)
          </h3>
        </div>
        
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
              barCategoryGap="20%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="quarter" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#666' }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#666' }}
                domain={[0, 10000]}
                ticks={[0, 2000, 4000, 6000, 8000, 10000]}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="rect"
              />
              <Bar 
                dataKey="Sales" 
                fill="#3b82f6" 
                name="Sales"
                radius={[2, 2, 0, 0]}
                maxBarSize={40}
              />
              <Bar 
                dataKey="Purchases" 
                fill="#10b981" 
                name="Purchases"
                radius={[2, 2, 0, 0]}
                maxBarSize={40}
              />
              <Bar 
                dataKey="Collection" 
                fill="#f59e0b" 
                name="Collection"
                radius={[2, 2, 0, 0]}
                maxBarSize={40}
              />
              <Bar 
                dataKey="Profit" 
                fill="#ef4444" 
                name="Profit"
                radius={[2, 2, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}