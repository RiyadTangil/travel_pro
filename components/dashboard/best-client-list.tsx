"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const clientData = [
  {
    id: 1,
    clientName: "Shoeb Munshi",
    mobile: "01834466952",
    salesAmount: "8,500",
    balance: "Adv 0",
  },
  {
    id: 2,
    clientName: "Mohammad Yasir Arafat",
    mobile: "+966572455395",
    salesAmount: "0",
    balance: "Due 760,000",
  },
];

export function BestClientList() {
  const [activeTab, setActiveTab] = useState("monthly");

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-medium">Best Client List</CardTitle>
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
                    <TableHead className="text-xs font-medium text-gray-600">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientData.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="text-sm">{client.clientName}</TableCell>
                      <TableCell className="text-sm">{client.mobile}</TableCell>
                      <TableCell className="text-sm">{client.salesAmount}</TableCell>
                      <TableCell className="text-sm">
                        <span className={client.balance.includes("Due") ? "text-red-600" : "text-green-600"}>
                          {client.balance}
                        </span>
                      </TableCell>
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
                    <TableHead className="text-xs font-medium text-gray-600">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientData.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="text-sm">{client.clientName}</TableCell>
                      <TableCell className="text-sm">{client.mobile}</TableCell>
                      <TableCell className="text-sm">{client.salesAmount}</TableCell>
                      <TableCell className="text-sm">
                        <span className={client.balance.includes("Due") ? "text-red-600" : "text-green-600"}>
                          {client.balance}
                        </span>
                      </TableCell>
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