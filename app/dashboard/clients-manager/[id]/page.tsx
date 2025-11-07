"use client"

import { useRouter, useParams } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard/header"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState } from "react"

export default function ClientDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const [client, setClient] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchClient = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/clients-manager/${id}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to load client")
        setClient(data.client)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchClient()
  }, [id])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Header (same as dashboard) */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto px-4 py-4">
          <DashboardHeader />
        </div>
      </header>

      <main className="flex-grow   px-4 py-6">
        {/* Breadcrumb */}
        <div className="mb-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>View Client Details</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Return Button */}
        <div className="mb-4">
          <Button variant="outline" onClick={() => router.push("/dashboard/clients-manager")}>Return to Client List</Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="details" className="mx-auto max-w-6xl">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="invoice">Invoice</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="quotation">Quotation</TabsTrigger>
            <TabsTrigger value="refund-product">Refund Product</TabsTrigger>
            <TabsTrigger value="upload-passports">List of Upload Passports</TabsTrigger>
            <TabsTrigger value="ledger">Clients Ledger</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Client Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex justify-between p-2 border rounded">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">{client?.name || "-"}</span>
                  </div>
                  <div className="flex justify-between p-2 border rounded">
                    <span className="text-muted-foreground">Client Type</span>
                    <span className="font-medium">{client?.clientType || "-"}</span>
                  </div>
                  <div className="flex justify-between p-2 border rounded">
                    <span className="text-sky-700 font-medium">Client Due</span>
                    <span className="text-red-600 font-semibold">{Number(client?.presentBalance || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between p-2 border rounded">
                    <span className="text-muted-foreground">Gender</span>
                    <span className="font-medium">{client?.gender || "-"}</span>
                  </div>
                  <div className="flex justify-between p-2 border rounded">
                    <span className="text-muted-foreground">Mobile</span>
                    <span className="font-medium">{client?.mobile || client?.phone || "-"}</span>
                  </div>
                  <div className="flex justify-between p-2 border rounded md:col-span-2">
                    <span className="text-muted-foreground">Address</span>
                    <span className="font-medium">{client?.address || "-"}</span>
                  </div>
                  <div className="flex justify-between p-2 border rounded">
                    <span className="text-muted-foreground">Designation</span>
                    <span className="font-medium">{client?.designation || "-"}</span>
                  </div>
                  <div className="flex justify-between p-2 border rounded">
                    <span className="text-muted-foreground">Trade License</span>
                    <span className="font-medium">{client?.tradeLicenseNo || client?.tradeLicense || "N/A"}</span>
                  </div>
                  <div className="flex justify-between p-2 border rounded">
                    <span className="text-muted-foreground">Create Date</span>
                    <span className="font-medium">{client?.createdAt ? new Date(client.createdAt).toLocaleDateString() : "-"}</span>
                  </div>
                  <div className="flex justify-between p-2 border rounded">
                    <span className="text-muted-foreground">Client Source</span>
                    <span className="font-medium">{client?.source || client?.clientSource || "-"}</span>
                  </div>
                  <div className="flex justify-between p-2 border rounded">
                    <span className="text-muted-foreground">Status</span>
                    <Badge className="px-3 bg-green-600">{client?.active ? "Active" : "Inactive"}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Placeholder contents for other tabs */}
          <TabsContent value="invoice" className="mt-4"><Card><CardContent>Invoice list (coming soon)</CardContent></Card></TabsContent>
          <TabsContent value="payments" className="mt-4"><Card><CardContent>Payments (coming soon)</CardContent></Card></TabsContent>
          <TabsContent value="quotation" className="mt-4"><Card><CardContent>Quotation (coming soon)</CardContent></Card></TabsContent>
          <TabsContent value="refund-product" className="mt-4"><Card><CardContent>Refund Product (coming soon)</CardContent></Card></TabsContent>
          <TabsContent value="upload-passports" className="mt-4"><Card><CardContent>Uploaded Passports (coming soon)</CardContent></Card></TabsContent>
          <TabsContent value="ledger" className="mt-4"><Card><CardContent>Clients Ledger (coming soon)</CardContent></Card></TabsContent>
        </Tabs>
      </main>
    </div>
  )
}