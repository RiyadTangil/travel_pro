"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

interface BestClient {
  id: string;
  name: string;
  phone: string;
  totalSales: number;
  presentBalance: number;
}

interface BestClientListProps {
  monthlyData?: BestClient[];
  yearlyData?: BestClient[];
  isLoading: boolean;
}

export function BestClientList({ monthlyData, yearlyData, isLoading }: BestClientListProps) {
  const [activeTab, setActiveTab] = useState("monthly");

  const renderTable = (clients?: BestClient[]) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="text-xs font-medium text-gray-600">Client Name</TableHead>
            <TableHead className="text-xs font-medium text-gray-600">Mobile</TableHead>
            <TableHead className="text-xs font-medium text-gray-600 text-right">Sales Amount</TableHead>
            <TableHead className="text-xs font-medium text-gray-600 text-right">Balance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients?.map((client) => {
            const isDue = client.presentBalance < 0;
            const isAdv = client.presentBalance > 0;
            const balanceLabel = isDue ? "Due" : isAdv ? "Adv" : "";
            const balanceValue = Math.abs(client.presentBalance).toLocaleString();
            
            return (
              <TableRow key={client.id}>
                <TableCell className="text-sm font-medium">{client.name}</TableCell>
                <TableCell className="text-sm text-gray-500">{client.phone}</TableCell>
                <TableCell className="text-sm text-right font-semibold text-blue-600">
                  {client.totalSales.toLocaleString()}
                </TableCell>
                <TableCell className="text-sm text-right">
                  <span className={isDue ? "text-red-600 font-medium" : isAdv ? "text-green-600 font-medium" : "text-gray-400"}>
                    {balanceLabel} {balanceValue}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
          {(!clients || clients.length === 0) && !isLoading && (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-8 text-gray-400 text-sm">
                No client data available for this period
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
          <CardTitle className="text-lg font-medium">Best Client List</CardTitle>
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