"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

const employeeData = [
  {
    id: 1,
    clientName: "Tanvir Hasan",
    mobile: "01737966040",
    salesAmount: "8,500",
  },
];

export function BestEmployeeList() {
  const [activeTab, setActiveTab] = useState("monthly");

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">Best Employee List</CardTitle>
          <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
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
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs font-medium text-gray-600">Client Name</TableHead>
                    <TableHead className="text-xs font-medium text-gray-600">Mobile</TableHead>
                    <TableHead className="text-xs font-medium text-gray-600">Sales Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeeData.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="text-sm">{employee.clientName}</TableCell>
                      <TableCell className="text-sm">{employee.mobile}</TableCell>
                      <TableCell className="text-sm">{employee.salesAmount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          
          <TabsContent value="yearly">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs font-medium text-gray-600">Client Name</TableHead>
                    <TableHead className="text-xs font-medium text-gray-600">Mobile</TableHead>
                    <TableHead className="text-xs font-medium text-gray-600">Sales Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeeData.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="text-sm">{employee.clientName}</TableCell>
                      <TableCell className="text-sm">{employee.mobile}</TableCell>
                      <TableCell className="text-sm">{employee.salesAmount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}