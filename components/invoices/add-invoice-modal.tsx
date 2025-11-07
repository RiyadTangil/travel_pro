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
import { CustomDropdown } from "./custom-dropdown"

import { TicketInformation } from "./ticket-information"
import { HotelInformation } from "./hotel-information"
import { TransportInformation } from "./transport-information"
import { BillingInformation } from "./billing-information"
import { MoneyReceipt } from "./money-receipt"
import { PassportInformation } from "./passport-information"
import { Invoice } from "@/types/invoice"
import { generateInvoiceNumber, generateMoneyReceiptNumber } from "@/data/invoices"

interface AddInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  onInvoiceAdded?: (invoice: Invoice) => void
}

export function AddInvoiceModal({ isOpen, onClose, onInvoiceAdded }: AddInvoiceModalProps) {
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
    const salesDateInput = (document.getElementById("general[salesDate]") as HTMLInputElement | null)?.value?.trim()

    const invoiceNo = invoiceNoInput && invoiceNoInput.length > 0 ? invoiceNoInput : generateInvoiceNumber()
    const salesDate = salesDateInput && salesDateInput.length > 0 ? new Date(salesDateInput).toISOString() : new Date().toISOString()

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
      salesDate,
      salesPrice,
      receivedAmount,
      dueAmount,
      status,
      salesBy: "Unknown",
      moneyReceiptNo: receivedAmount > 0 ? generateMoneyReceiptNumber() : "",
      notes: ""
    }
  }

  const handleCreate = () => {
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="general[client]">Select Client</Label>
                    <CustomDropdown
                      placeholder="Select client"
                      options={["Client A", "Client B", "Client C"]}
                      value={""}
                      onValueChange={() => {}}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="general[salesBy]">Sales By</Label>
                    <CustomDropdown
                      placeholder="Select staff"
                      options={["Staff 1", "Staff 2", "Staff 3"]}
                      value={""}
                      onValueChange={() => {}}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="general[invoiceNo]">Invoice No</Label>
                    <Input id="general[invoiceNo]" placeholder="Enter invoice number" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="general[salesDate]">Sales Date</Label>
                    <Input id="general[salesDate]" type="date" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="general[dueDate]">Due Date</Label>
                    <Input id="general[dueDate]" type="date" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="general[agent]">Select Agent</Label>
                    <CustomDropdown
                      placeholder="Select agent"
                      options={["Agent X", "Agent Y", "Agent Z"]}
                      value={""}
                      onValueChange={() => {}}
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
            <BillingInformation />
            
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
  )
}