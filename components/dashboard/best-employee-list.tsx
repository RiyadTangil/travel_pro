"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface BestEmployee {
  id: string;
  name: string;
  department: string;
  totalSales: number;
}

interface BestEmployeeListProps {
  monthlyData?: BestEmployee[];
  yearlyData?: BestEmployee[];
  isLoading: boolean;
}

export function BestEmployeeList({ monthlyData, yearlyData, isLoading }: BestEmployeeListProps) {
  const [activeTab, setActiveTab] = useState("monthly");
  const router = useRouter();
  const renderTable = (employees?: BestEmployee[]) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="text-xs font-medium text-gray-600">Employee Name</TableHead>
            <TableHead className="text-xs font-medium text-gray-600">Department</TableHead>
            <TableHead className="text-xs font-medium text-gray-600 text-right">Sales Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees?.map((employee) => (
            <TableRow key={employee.id}>
              <TableCell className="text-sm font-medium">{employee.name}</TableCell>
              <TableCell className="text-sm text-gray-500">{employee.department}</TableCell>
              <TableCell className="text-sm text-right font-semibold text-green-600">
                {employee.totalSales.toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
          {(!employees || employees.length === 0) && !isLoading && (
            <TableRow>
              <TableCell colSpan={3} className="text-center py-8 text-gray-400 text-sm">
                No employee performance data for this period
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <Card className="w-full relative">
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center rounded-xl">
          <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
        </div>
      )}
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">Best Employee List</CardTitle>
          <Button onClick={() => router.push("/dashboard/reports/sales_man_collection_report")} variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
            Show All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="monthly" className="text-sm">MONTHLY</TabsTrigger>
            <TabsTrigger value="yearly" className="text-sm">YEARLY</TabsTrigger>
          </TabsList>
          
          <TabsContent value="monthly">
            {renderTable(monthlyData)}
          </TabsContent>
          
          <TabsContent value="yearly">
            {renderTable(yearlyData)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}