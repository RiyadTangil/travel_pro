"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { CalendarIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Invoice } from "@/types/invoice"
import { generateInvoiceNumber, generateMoneyReceiptNumber } from "@/data/invoices"

interface SimpleAddInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  onInvoiceAdded: (invoice: Invoice) => void
}

export function SimpleAddInvoiceModal({ isOpen, onClose, onInvoiceAdded }: SimpleAddInvoiceModalProps) {
  const [formData, setFormData] = useState({
    clientName: "",
    clientPhone: "",
    passportNo: "",
    salesPrice: "",
    receivedAmount: "",
    salesBy: "",
    notes: ""
  })
  const [salesDate, setSalesDate] = useState<Date>()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const salesPrice = parseFloat(formData.salesPrice) || 0
      const receivedAmount = parseFloat(formData.receivedAmount) || 0
      const dueAmount = salesPrice - receivedAmount

      // Determine status based on payment
      let status: Invoice['status'] = 'due'
      if (receivedAmount >= salesPrice) {
        status = 'paid'
      } else if (receivedAmount > 0) {
        status = 'partial'
      }

      const newInvoice: Invoice = {
        id: Date.now().toString(),
        invoiceNo: generateInvoiceNumber(),
        clientName: formData.clientName,
        clientPhone: formData.clientPhone,
        passportNo: formData.passportNo,
        salesDate: salesDate?.toISOString() || new Date().toISOString(),
        salesPrice,
        receivedAmount,
        dueAmount,
        status,
        salesBy: formData.salesBy,
        moneyReceiptNo: receivedAmount > 0 ? generateMoneyReceiptNumber() : "",
        notes: formData.notes
      }

      onInvoiceAdded(newInvoice)
      
      // Reset form
      setFormData({
        clientName: "",
        clientPhone: "",
        passportNo: "",
        salesPrice: "",
        receivedAmount: "",
        salesBy: "",
        notes: ""
      })
      setSalesDate(undefined)
      onClose()
    } catch (error) {
      console.error("Error adding invoice:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Invoice</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Client Name */}
            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name *</Label>
              <Input
                id="clientName"
                value={formData.clientName}
                onChange={(e) => handleInputChange("clientName", e.target.value)}
                placeholder="Enter client name"
                required
              />
            </div>

            {/* Client Phone */}
            <div className="space-y-2">
              <Label htmlFor="clientPhone">Client Phone *</Label>
              <Input
                id="clientPhone"
                value={formData.clientPhone}
                onChange={(e) => handleInputChange("clientPhone", e.target.value)}
                placeholder="Enter phone number"
                required
              />
            </div>

            {/* Passport No */}
            <div className="space-y-2">
              <Label htmlFor="passportNo">Passport No</Label>
              <Input
                id="passportNo"
                value={formData.passportNo}
                onChange={(e) => handleInputChange("passportNo", e.target.value)}
                placeholder="Enter passport number"
              />
            </div>

            {/* Sales Date */}
            <div className="space-y-2">
              <Label>Sales Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !salesDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {salesDate ? format(salesDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={salesDate}
                    onSelect={setSalesDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Sales Price */}
            <div className="space-y-2">
              <Label htmlFor="salesPrice">Sales Price *</Label>
              <Input
                id="salesPrice"
                type="number"
                step="0.01"
                min="0"
                value={formData.salesPrice}
                onChange={(e) => handleInputChange("salesPrice", e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            {/* Received Amount */}
            <div className="space-y-2">
              <Label htmlFor="receivedAmount">Received Amount</Label>
              <Input
                id="receivedAmount"
                type="number"
                step="0.01"
                min="0"
                value={formData.receivedAmount}
                onChange={(e) => handleInputChange("receivedAmount", e.target.value)}
                placeholder="0.00"
              />
            </div>

            {/* Sales By */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="salesBy">Sales By *</Label>
              <Select value={formData.salesBy} onValueChange={(value) => handleInputChange("salesBy", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sales person" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tanvir Hasan">Tanvir Hasan</SelectItem>
                  <SelectItem value="Sarah Ahmed">Sarah Ahmed</SelectItem>
                  <SelectItem value="Rafiq Islam">Rafiq Islam</SelectItem>
                  <SelectItem value="Fatima Khan">Fatima Khan</SelectItem>
                  <SelectItem value="Karim Rahman">Karim Rahman</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Additional notes or comments"
                rows={3}
              />
            </div>
          </div>

          {/* Due Amount Display */}
          {formData.salesPrice && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center text-sm">
                <span>Sales Price:</span>
                <span className="font-medium">৳{parseFloat(formData.salesPrice || "0").toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Received Amount:</span>
                <span className="font-medium">৳{parseFloat(formData.receivedAmount || "0").toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-semibold border-t pt-2 mt-2">
                <span>Due Amount:</span>
                <span className={cn(
                  "font-bold",
                  (parseFloat(formData.salesPrice || "0") - parseFloat(formData.receivedAmount || "0")) > 0 
                    ? "text-red-600" 
                    : "text-green-600"
                )}>
                  ৳{(parseFloat(formData.salesPrice || "0") - parseFloat(formData.receivedAmount || "0")).toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !formData.clientName || !formData.clientPhone || !formData.salesPrice || !formData.salesBy || !salesDate}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? "Adding..." : "Add Invoice"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}