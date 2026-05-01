"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoreVertical, Download, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useList } from "@/hooks/api/useList";
import { API, KEYS } from "@/lib/api/api-endpoints";

interface ChartData {
  quarter: string;
  Sales: number;
  Purchases: number;
  Collection: number;
  Profit: number;
}

export function YearlySalesChart() {
  const { data: session } = useSession();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [activeLegend, setActiveLegend] = useState<string | null>(null);
  const [hoveredBar, setHoveredBar] = useState<any>(null);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());
  }, []);

  const { data: response, isLoading } = useList<ChartData[]>(
    KEYS.DASH.YEARLY, API.DASH.YEARLY, session?.user?.companyId,
    { year: selectedYear },
  );

  const chartData = response?.data || [];

  const handleDownload = (format: string) => {
    if (format === 'csv') {
      const headers = ['Quarter', 'Sales', 'Purchases', 'Collection', 'Profit'];
      const rows = chartData.map(item => [item.quarter, item.Sales, item.Purchases, item.Collection, item.Profit]);
      const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `yearly_sales_${selectedYear}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // PNG/SVG downloads would ideally use a ref to the chart container and a library like html-to-image
      console.log(`Downloading chart as ${format} (requires additional setup)`);
    }
  };
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const entry = payload[0]; // 👈 only the hovered bar

      return (
        <div className="bg-white p-3 border rounded shadow-lg pointer-events-none">
          <p className="text-sm font-bold mb-2">
            {label} {selectedYear}
          </p>

          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3"
              style={{ backgroundColor: entry.fill }}
            />
            <span className="text-xs text-gray-600">
              {entry.name}:
            </span>
            <span className="text-xs font-semibold">
              {entry.value.toLocaleString()}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const onLegendMouseEnter = (data: any) => {
    setActiveLegend(data.dataKey);
  };

  const onLegendMouseLeave = () => {
    setActiveLegend(null);
  };

  const getOpacity = (dataKey: string) => {
    if (!activeLegend) return 1;
    return activeLegend === dataKey ? 1 : 0.2;
  };

  return (
    <Card className="w-full h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <CardTitle className="text-lg font-medium">Yearly Sales Chart</CardTitle>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[100px] h-8 text-xs">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map(year => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
            Financial Metrics by Quarter ({selectedYear})
          </h3>
        </div>

        <div className="h-[300px] w-full relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
              <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
            </div>
          )}
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              barGap={8}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
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
                tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: 'transparent' }}
                shared={false}
              />
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="rect"
                onMouseEnter={onLegendMouseEnter}
                onMouseLeave={onLegendMouseLeave}
                className="cursor-pointer"
              />
              <Bar
                dataKey="Sales"
                fill="#3b82f6"
                name="Sales"
                radius={[4, 4, 0, 0]}
                maxBarSize={30}
                opacity={getOpacity("Sales")}
                onMouseEnter={(data) => setHoveredBar(data)}
                onMouseLeave={() => setHoveredBar(null)}
              />
              <Bar
                dataKey="Purchases"
                fill="#10b981"
                name="Purchases"
                radius={[4, 4, 0, 0]}
                maxBarSize={30}
                opacity={getOpacity("Purchases")}
                onMouseEnter={(data) => setHoveredBar(data)}
                onMouseLeave={() => setHoveredBar(null)}
              />
              <Bar
                dataKey="Collection"
                fill="#f59e0b"
                name="Collection"
                radius={[4, 4, 0, 0]}
                maxBarSize={30}
                opacity={getOpacity("Collection")}
                onMouseEnter={(data) => setHoveredBar(data)}
                onMouseLeave={() => setHoveredBar(null)}
              />
              <Bar
                dataKey="Profit"
                fill="#ef4444"
                name="Profit"
                radius={[4, 4, 0, 0]}
                maxBarSize={30}
                opacity={getOpacity("Profit")}
                onMouseEnter={(data) => setHoveredBar(data)}
                onMouseLeave={() => setHoveredBar(null)}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
