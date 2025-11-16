"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CustomDropdown } from "./custom-dropdown"
import { Switch } from "@/components/ui/switch"
import { DateInput } from "@/components/ui/date-input"

const paymentMethodOptions = [
  "Cash", "Credit Card", "Debit Card", "Bank Transfer", "Check", 
  "PayPal", "Online Payment", "Mobile Payment", "Cryptocurrency"
]

const currencyOptions = [
  "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY", "INR", "AED"
]

export function MoneyReceipt() {
  const [receiptData, setReceiptData] = useState({
    receiptNumber: "",
    receiptDate: "",
    paymentMethod: "",
    currency: "USD",
    amountPaid: "",
    balanceAmount: "",
    paymentReference: "",
    receivedFrom: "",
    receivedBy: "",
    notes: "",
    termsAndConditions: "1. Payment is due within 30 days of invoice date.\n2. Late payments may incur additional charges.\n3. All disputes must be raised within 7 days of receipt.\n4. Refunds are subject to company policy.",
    paidInFull: false,
    includeTerms: true,
  })

  const updateReceiptData = (field: string, value: string | boolean) => {
    setReceiptData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Money Receipt</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payment Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
              <div className="space-y-2">
                <Label htmlFor="receiptNumber">Receipt Number</Label>
                <Input
                  id="receiptNumber"
                  placeholder="Enter receipt number"
                  value={receiptData.receiptNumber}
                  onChange={(e) => updateReceiptData('receiptNumber', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="receiptDate">Receipt Date</Label>
                <DateInput
                  value={receiptData.receiptDate ? new Date(receiptData.receiptDate) : undefined}
                  onChange={(d) => updateReceiptData('receiptDate', d ? d.toISOString().slice(0,10) : "")}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <CustomDropdown
                  placeholder="Select payment method"
                  options={paymentMethodOptions}
                  value={receiptData.paymentMethod}
                  onValueChange={(value) => updateReceiptData('paymentMethod', value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Currency</Label>
                <CustomDropdown
                  placeholder="Select currency"
                  options={currencyOptions}
                  value={receiptData.currency}
                  onValueChange={(value) => updateReceiptData('currency', value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Paid in Full</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={receiptData.paidInFull}
                    onCheckedChange={(checked) => updateReceiptData('paidInFull', checked)}
                  />
                  <span className="text-sm text-gray-600">Mark receipt as fully paid</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Amount Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Amount Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amountPaid">Amount Paid</Label>
                <Input
                  id="amountPaid"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={receiptData.amountPaid}
                  onChange={(e) => updateReceiptData('amountPaid', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="balanceAmount">Balance Amount</Label>
                <Input
                  id="balanceAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={receiptData.balanceAmount}
                  onChange={(e) => updateReceiptData('balanceAmount', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="paymentReference">Reference No</Label>
                <Input
                  id="paymentReference"
                  placeholder="Transaction ID / Reference"
                  value={receiptData.paymentReference}
                  onChange={(e) => updateReceiptData('paymentReference', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="receivedFrom">Received From</Label>
                <Input
                  id="receivedFrom"
                  placeholder="Client / Payer name"
                  value={receiptData.receivedFrom}
                  onChange={(e) => updateReceiptData('receivedFrom', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="receivedBy">Received By</Label>
                <Input
                  id="receivedBy"
                  placeholder="Staff / Receiver name"
                  value={receiptData.receivedBy}
                  onChange={(e) => updateReceiptData('receivedBy', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Additional Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes or comments"
              value={receiptData.notes}
              onChange={(e) => updateReceiptData('notes', e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Include Terms & Conditions</Label>
            <div className="flex items-center gap-2">
              <Switch
                checked={receiptData.includeTerms}
                onCheckedChange={(checked) => updateReceiptData('includeTerms', checked)}
              />
              <span className="text-sm text-gray-600">Show terms on receipt</span>
            </div>
          </div>
          
          {receiptData.includeTerms && (
            <div className="space-y-2">
              <Label htmlFor="termsAndConditions">Terms and Conditions</Label>
              <Textarea
                id="termsAndConditions"
                placeholder="Enter terms and conditions"
                value={receiptData.termsAndConditions}
                onChange={(e) => updateReceiptData('termsAndConditions', e.target.value)}
                rows={6}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}