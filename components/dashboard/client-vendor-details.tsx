"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, Download, Loader2 } from "lucide-react";
import { useList } from "@/hooks/api/useList";
import { API, KEYS } from "@/lib/api/api-endpoints";
import { useSession } from "next-auth/react";

interface StatsData {
  category: string;
  Total: number;
  Active: number;
  Inactive: number;
}

export default function ClientVendorDetails() {
  const { data: session } = useSession();
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);

  const { data: response, isLoading } = useList<StatsData[]>(
    KEYS.DASH.CLIENT_VENDOR_STATS,
    API.DASH.CLIENT_VENDOR_STATS,
    session?.user?.companyId,
    undefined,
  );

  const chartData = response?.data || [
    { category: "Clients", Total: 0, Active: 0, Inactive: 0 },
    { category: "Vendors", Total: 0, Active: 0, Inactive: 0 },
    { category: "Combined", Total: 0, Active: 0, Inactive: 0 },
  ];

  const handleDownload = (format: string) => {
    // TODO: Implement actual download functionality
    console.log(`Downloading chart as ${format}`)
  }

  const getOpacity = (dataKey: string) => {
    if (!hoveredBar) return 1;
    return hoveredBar === dataKey ? 1 : 0.2;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold text-sm mb-2 text-gray-700">{data.category}</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <p className="text-xs text-gray-600">Total: <span className="font-medium text-gray-900">{data.Total.toLocaleString()}</span></p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <p className="text-xs text-gray-600">Active: <span className="font-medium text-gray-900">{data.Active.toLocaleString()}</span></p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <p className="text-xs text-gray-600">Inactive: <span className="font-medium text-gray-900">{data.Inactive.toLocaleString()}</span></p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="relative">
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center rounded-xl">
          <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
        </div>
      )}
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
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="rect"
                onMouseEnter={(e) => setHoveredBar(e.dataKey as string)}
                onMouseLeave={() => setHoveredBar(null)}
              />
              <Bar 
                dataKey="Total" 
                fill="#3b82f6" 
                name="Total"
                radius={[2, 2, 0, 0]}
                maxBarSize={30}
                opacity={getOpacity("Total")}
                onMouseEnter={() => setHoveredBar("Total")}
                onMouseLeave={() => setHoveredBar(null)}
              />
              <Bar 
                dataKey="Active" 
                fill="#10b981" 
                name="Active"
                radius={[2, 2, 0, 0]}
                maxBarSize={30}
                opacity={getOpacity("Active")}
                onMouseEnter={() => setHoveredBar("Active")}
                onMouseLeave={() => setHoveredBar(null)}
              />
              <Bar 
                dataKey="Inactive" 
                fill="#ef4444" 
                name="Inactive"
                radius={[2, 2, 0, 0]}
                maxBarSize={30}
                opacity={getOpacity("Inactive")}
                onMouseEnter={() => setHoveredBar("Inactive")}
                onMouseLeave={() => setHoveredBar(null)}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}