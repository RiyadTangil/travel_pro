"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useList } from "@/hooks/api/useList";
import { API, KEYS } from "@/lib/api/api-endpoints";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";

interface ExpenseStats {
  summary: {
    daily: number;
    monthly: number;
    yearly: number;
  };
  chart: Array<{
    name: string;
    value: number;
  }>;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

export function ExpenseDetails() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const { data: response, isLoading } = useList<ExpenseStats>(
    KEYS.DASH.EXPENSE_STATS,
    API.DASH.EXPENSE_STATS
  );

  const stats = response?.data || {
    summary: { daily: 0, monthly: 0, yearly: 0 },
    chart: [],
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-2 border rounded shadow-md">
          <p className="text-xs font-bold text-gray-800">{data.name}</p>
          <p className="text-xs text-sky-600 font-semibold">{fmt(data.value)} BDT</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="w-full relative min-h-[350px]">
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center rounded-xl">
          <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
        </div>
      )}
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-semibold text-gray-700">Expense Details</CardTitle>
        <button className="text-xs text-sky-500 hover:underline">Show All</button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          {/* Left: Pie Chart */}
          <div className="h-48 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.chart.length > 0 ? stats.chart : [{ name: "No Data", value: 1 }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                  onMouseEnter={(_, index) => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {(stats.chart.length > 0 ? stats.chart : [{ name: "No Data", value: 1 }]).map((_, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={stats.chart.length > 0 ? COLORS[index % COLORS.length] : "#f3f4f6"} 
                      opacity={hoveredIndex === null || hoveredIndex === index ? 1 : 0.3}
                      stroke="none"
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Legend inside chart area - simplistic approach for design match */}
            <div className="absolute top-0 right-0 space-y-1">
              {stats.chart.slice(0, 3).map((item, index) => (
                <div key={index} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <span className="text-[10px] text-gray-500 truncate max-w-[60px]">{item.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Summary List */}
          <div className="space-y-4">
            <div className="flex justify-between items-center group">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-tight">Daily Expense</span>
              <span className="text-sm font-bold text-sky-500 group-hover:scale-105 transition-transform">
                {fmt(stats.summary.daily)} BDT
              </span>
            </div>
            <div className="flex justify-between items-center group">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-tight">Monthly Expense</span>
              <span className="text-sm font-bold text-blue-600 group-hover:scale-105 transition-transform">
                {fmt(stats.summary.monthly)} BDT
              </span>
            </div>
            <div className="flex justify-between items-center group">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-tight">Yearly Expense</span>
              <span className="text-sm font-bold text-rose-500 group-hover:scale-105 transition-transform">
                {fmt(stats.summary.yearly)} BDT
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
