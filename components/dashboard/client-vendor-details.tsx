"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, Download } from "lucide-react";

const chartData = [
  {
    category: "Clients",
    Total: 13,
    Active: 12,
    Inactive: 1,
  },
  {
    category: "Vendors",
    Total: 13,
    Active: 12,
    Inactive: 1,
  },
  {
    category: "Combined",
    Total: 0,
    Active: 0,
    Inactive: 0,
  },
];

export default function ClientVendorDetails() {
  const handleDownload = (format: string) => {
    // TODO: Implement actual download functionality
    console.log(`Downloading chart as ${format}`)
  }

  return (
    <Card className="">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">Client and Vendor Details</CardTitle>
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
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-4">
            Clients, Vendors, and Combined Overview
          </h3>
        </div>
        
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
              barCategoryGap="30%"
            >
              <XAxis 
                dataKey="category" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#666' }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#666' }}
                domain={[0, 15]}
                ticks={[0, 3, 6, 9, 12, 15]}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="rect"
              />
              <Bar 
                dataKey="Total" 
                fill="#3b82f6" 
                name="Total"
                radius={[2, 2, 0, 0]}
                maxBarSize={30}
              />
              <Bar 
                dataKey="Active" 
                fill="#10b981" 
                name="Active"
                radius={[2, 2, 0, 0]}
                maxBarSize={30}
              />
              <Bar 
                dataKey="Inactive" 
                fill="#ef4444" 
                name="Inactive"
                radius={[2, 2, 0, 0]}
                maxBarSize={30}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}