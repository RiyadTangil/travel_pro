"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DateInput } from "@/components/ui/date-input"
import { CustomDropdown } from "./custom-dropdown"
import ClientSelect from "@/components/clients/client-select"
import EmployeeSelect from "@/components/employees/employee-select"
import AgentSelect from "@/components/agents/agent-select"
import AddClientModal from "@/components/clients/add-client-modal"
import { EmployeeModal } from "@/components/employees/employee-modal"
import { AgentModal } from "@/components/agents/agent-modal"

import { TicketInformation } from "./ticket-information"
import { HotelInformation } from "./hotel-information"
import { TransportInformation } from "./transport-information"
import { BillingInformation } from "./billing-information"
import { MoneyReceipt } from "./money-receipt"
import { PassportInformation } from "./passport-information"
import { Invoice } from "@/types/invoice"
import { generateInvoiceNumber, generateMRNumber } from "@/data/invoices"
import { VendorAddModal } from "@/components/vendors/vendor-add-modal"
import { useSession } from "next-auth/react"

interface AddInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  onInvoiceAdded?: (invoice: Invoice) => void
  initialInvoice?: Invoice
}

export function AddInvoiceModal({ isOpen, onClose, onInvoiceAdded, initialInvoice }: AddInvoiceModalProps) {
  const { data: session } = useSession()
  const [clientId, setClientId] = useState<string | undefined>()
  const [employeeId, setEmployeeId] = useState<string | undefined>()
  const [agentId, setAgentId] = useState<string | undefined>()
  const [salesDate, setSalesDate] = useState<Date | undefined>(undefined)
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined)
  const [openAddClient, setOpenAddClient] = useState(false)
  const [openAddEmployee, setOpenAddEmployee] = useState(false)
  const [openAddAgent, setOpenAddAgent] = useState(false)
  const [openAddVendor, setOpenAddVendor] = useState(false)
  const [formData, setFormData] = useState({
    passport: [],
    ticket: [],
    hotel: [],
    transport: [],
    billing: [],
    moneyReceipt: {}
  })

  const buildInvoice = (): Invoice => {
    const invoiceNoInput = (document.getElementById("general[invoiceNo]") as HTMLInputElement | null)?.value?.trim()
    const invoiceNo = invoiceNoInput && invoiceNoInput.length > 0 ? invoiceNoInput : generateInvoiceNumber()
    const salesDateIso = salesDate ? salesDate.toISOString() : new Date().toISOString()

    // Basic defaults until sections are fully wired
    const salesPrice = 0
    const receivedAmount = 0
    const dueAmount = salesPrice - receivedAmount

    const status: Invoice['status'] = dueAmount <= 0 ? 'paid' : receivedAmount > 0 ? 'partial' : 'due'

    return {
      id: Date.now().toString(),
      invoiceNo,
      clientName: "Unknown Client",
      clientPhone: "",
      passportNo: "",
      salesDate: salesDateIso,
      salesPrice,
      receivedAmount,
      dueAmount,
      status,
      salesBy: "Unknown",
      mrNo: receivedAmount > 0 ? generateMRNumber() : "",
      notes: ""
    }
  }

  const handleCreate = () => {
    const invoiceNoInput = (document.getElementById("general[invoiceNo]") as HTMLInputElement | null)?.value?.trim()
    if (!clientId) { alert("Select Client is required."); return }
    if (!employeeId) { alert("Sales By is required."); return }
    if (!invoiceNoInput) { alert("Invoice No is required."); return }
    if (!salesDate) { alert("Sales Date is required."); return }

    const newInvoice = buildInvoice()
    console.log("Creating invoice:", newInvoice)
    onInvoiceAdded?.(newInvoice)
    onClose()
  }

  const handleCreatePreview = () => {
    const newInvoice = buildInvoice()
    console.log("Creating invoice (preview):", newInvoice)
    onInvoiceAdded?.(newInvoice)
    onClose()
  }

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-[90%] h-[85vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-xl font-semibold">Add Invoice</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 h-full px-6">
          <div className="space-y-6 py-4">
            {/* General Information */}
            <Card>
              <CardHeader className="flex items-center justify-between space-y-0">
                <CardTitle className="text-base">General Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 lg:[grid-template-columns:repeat(6,minmax(0,1fr))]">
                  <div className="space-y-2">
                    <Label htmlFor="general[client]">Select Client <span className="text-red-500">*</span></Label>
                    <ClientSelect
                      value={clientId}
                      onChange={(id) => setClientId(id)}
                      onRequestAdd={() => setOpenAddClient(true)}
                      placeholder="Select client"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="general[salesBy]">Sales By <span className="text-red-500">*</span></Label>
                    <EmployeeSelect
                      value={employeeId}
                      onChange={(id) => setEmployeeId(id)}
                      onRequestAdd={() => setOpenAddEmployee(true)}
                      placeholder="Select staff"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="general[invoiceNo]">Invoice No *</Label>
                    <Input id="general[invoiceNo]" placeholder="Enter invoice number" defaultValue={initialInvoice?.invoiceNo || ""} />
                  </div>

                  <div className="space-y-2">
                    <Label>Sales Date <span className="text-red-500">*</span></Label>
                    <DateInput value={salesDate} onChange={setSalesDate} />
                  </div>

                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <DateInput value={dueDate} onChange={setDueDate} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="general[agent]">Select Agent</Label>
                    <AgentSelect
                      value={agentId}
                      onChange={(id) => setAgentId(id)}
                      onRequestAdd={() => setOpenAddAgent(true)}
                      placeholder="Select agent"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Passport Information */}
            <PassportInformation />
            
            <Separator />
            
            {/* Ticket Information */}
            <TicketInformation />
            
            <Separator />
            
            {/* Hotel Information */}
            <HotelInformation />
            
            <Separator />
            
            {/* Transport Information */}
            <TransportInformation />
            
            <Separator />
            
            {/* Billing Information */}
            <BillingInformation onRequestAddVendor={() => setOpenAddVendor(true)} />
            
            <Separator />
            
            {/* Money Receipt */}
            <MoneyReceipt />
        </div>
      </ScrollArea>
        
        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">
            Create
          </Button>
          <Button onClick={handleCreatePreview} variant="secondary" className="bg-blue-500 hover:bg-blue-600">
            Create & Preview
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    {/* Modals for adding new entries */}
    <AddClientModal open={openAddClient} onOpenChange={(v) => setOpenAddClient(v)} onSubmit={async () => { setOpenAddClient(false) }} />
    <EmployeeModal open={openAddEmployee} onClose={() => setOpenAddEmployee(false)} onSubmit={async () => { setOpenAddEmployee(false) }} />
    <AgentModal open={openAddAgent} onClose={() => setOpenAddAgent(false)} onSubmit={async () => { setOpenAddAgent(false) }} />
    <VendorAddModal
      open={openAddVendor}
      onOpenChange={(v) => setOpenAddVendor(v)}
      onSubmit={async (v) => {
        await fetch(`/api/vendors`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...v, companyId: session?.user?.companyId ?? null })
        })
        setOpenAddVendor(false)
      }}
    />
    </>
  )
}