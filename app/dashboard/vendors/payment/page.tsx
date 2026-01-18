"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import PaymentModal from "@/components/vendors/payment-modal"
import PaymentTable from "@/components/vendors/payment-table"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { useInvoiceLookups } from "@/hooks/useInvoiceLookups"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { DashboardHeader } from "@/components/dashboard/header"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

export default function VendorPaymentPage() {
  const { data: session } = useSession()
  const [openModal, setOpenModal] = useState(false)
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [editPayment, setEditPayment] = useState<any>(undefined)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const { lookups } = useInvoiceLookups()
  
  const accountsPreloaded = useMemo(() => (
    lookups?.accounts?.map(a => ({ 
      id: a.id, 
      name: a.name, 
      type: a.type as any,
    })) || []
  ), [lookups?.accounts])

  const loadPayments = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/vendors/payment?page=1&pageSize=50&search=${search}`, {
        headers: { "x-company-id": session?.user?.companyId || "" }
      })
      const result = await res.json()
      if (result.items) {
        // Map API response to Table format
        const mapped = result.items.map((item: any, index: number) => ({
          id: item.id,
          sl: index + 1,
          date: item.paymentDate,
          voucherNo: item.voucherNo,
          paymentTo: item.paymentTo === "invoice" ? "Specific Invoice" : 
                     item.paymentTo === "advance" ? "Advance Payment" : 
                     item.paymentTo === "adjust" ? "Adjust With Due" : "Overall",
          vendorInvoice: item.paymentTo === "invoice" ? (item.invoiceNo || item.vendorNames) : (item.vendorName || "N/A"),
          account: item.accountId?.name || item.accountName || "N/A",
          totalPayment: item.totalAmount,
          doc: !!item.voucherImage, // Assuming voucherImage existence means doc
          note: item.note,
          raw: item // Keep raw data for edit
        }))
        setData(mapped)
      }
    } catch (error) {
      console.error("Failed to load payments:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPayments()
  }, [session, search])

  const handlePaymentSubmit = async (formData: any) => {
    try {
      setSaving(true)
      const isEdit = !!editPayment
      const url = isEdit ? `/api/vendors/payment/${editPayment.id}` : `/api/vendors/payment`
      const method = isEdit ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          "x-company-id": session?.user?.companyId || "" 
        },
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || "Failed to save payment")
        return
      }

      toast.success(isEdit ? "Payment updated successfully" : "Payment created successfully")
      setOpenModal(false)
      setEditPayment(undefined)
      loadPayments()
    } catch (error) {
      console.error(error)
      toast.error("Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (row: any) => {
    // Populate form data from raw item
    const raw = row.raw
    // We need to shape it for the form defaultValues
    // Note: PaymentModal expects flat values mostly, but invoiceVendors is array
    const formData = {
        paymentTo: raw.paymentTo,
        invoiceId: raw.invoiceId?._id || raw.invoiceId, // raw.invoiceId might be populated object or id
        invoiceVendors: raw.invoiceVendors?.map((v: any) => ({
            vendorId: v.vendorId?._id || v.vendorId, // might be populated
            amount: v.amount
        })) || [],
        vendorId: raw.vendorId, // if we had it stored directly
        paymentMethod: raw.paymentMethod,
        accountId: raw.accountId?._id || raw.accountId,
        amount: raw.amount,
        vendorAit: raw.vendorAit,
        totalAmount: raw.totalAmount,
        receiptNo: raw.receiptNo,
        referPassport: raw.referPassport,
        passportNo: raw.passportNo,
        date: raw.paymentDate ? new Date(raw.paymentDate) : new Date(),
        note: raw.note
    }
    setEditPayment({ id: raw.id, ...formData })
    setOpenModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this payment? This will revert all balance updates.")) return

    try {
      setDeletingId(id)
      const res = await fetch(`/api/vendors/payment/${id}`, {
        method: "DELETE",
        headers: { "x-company-id": session?.user?.companyId || "" }
      })
      if (!res.ok) {
        toast.error("Failed to delete payment")
        return
      }
      toast.success("Payment deleted successfully")
      loadPayments()
    } catch (error) {
      console.error(error)
      toast.error("Error deleting payment")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="mx-auto px-4 py-4">
          <DashboardHeader />
        </div>
      </header>

      <main className="flex-grow py-6">
        <div className="mb-4 px-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Vendor Payments</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="mx-4 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
           <Button onClick={() => { setEditPayment(undefined); setOpenModal(true) }} className="bg-sky-500 hover:bg-sky-600">
             <Plus className="w-4 h-4 mr-2" /> Add Payment
           </Button>

           <div className="flex items-center gap-2">
               <Input 
                 placeholder="Search by voucher..." 
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 className="w-64 bg-white"
               />
           </div>
        </div>

        <Card className="mx-4 border-none shadow-none bg-transparent">
          <CardContent className="p-0">
            <div className="bg-white rounded-md border shadow-sm overflow-hidden">
              {loading && (
                <div className="p-4 text-sm text-gray-600 text-center">Loading payments...</div>
              )}
              <PaymentTable 
                data={data} 
                onEdit={handleEdit}
                onDelete={handleDelete}
                deletingId={deletingId}
              />
            </div>
          </CardContent>
        </Card>
      </main>

      <PaymentModal 
        open={openModal} 
        onOpenChange={setOpenModal}
        onSubmit={handlePaymentSubmit}
        accountsPreloaded={accountsPreloaded}
        initialData={editPayment} // Pass initial data for edit
        loading={saving}
      />
    </div>
  )
}
