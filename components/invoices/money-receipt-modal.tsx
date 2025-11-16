"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DateInput } from "@/components/ui/date-input"
import { useState, useEffect } from "react"
import { Invoice } from "@/types/invoice"

interface MoneyReceiptModalProps {
  open: boolean
  onClose: () => void
  invoice?: Invoice
  onSubmit?: (payload: {
    invoiceId: string
    paymentMethod: string
    account: string
    amount: number
    discount?: number
    paymentDate?: Date
    manualReceiptNo?: string
    note?: string
  }) => void
}

export function MoneyReceiptModal({ open, onClose, invoice, onSubmit }: MoneyReceiptModalProps) {
  const [paymentMethod, setPaymentMethod] = useState("")
  const [account, setAccount] = useState("")
  const [amount, setAmount] = useState<string>("")
  const [discount, setDiscount] = useState<string>("")
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(new Date())
  const [manualReceiptNo, setManualReceiptNo] = useState("")
  const [note, setNote] = useState("")

  useEffect(() => {
    if (open) {
      setPaymentMethod("")
      setAccount("")
      setAmount("")
      setDiscount("")
      setPaymentDate(new Date())
      setManualReceiptNo("")
      setNote("")
    }
  }, [open])

  const netTotal = invoice ? invoice.salesPrice : 0
  const paid = invoice ? invoice.receivedAmount : 0
  const due = Math.max(0, netTotal - paid)

  const isValid = () => {
    return paymentMethod && account && amount && paymentDate
  }

  const handleOk = () => {
    if (!isValid()) return
    onSubmit?.({
      invoiceId: invoice?.id || "",
      paymentMethod,
      account,
      amount: parseFloat(amount || "0") || 0,
      discount: parseFloat(discount || "0") || 0,
      paymentDate,
      manualReceiptNo,
      note
    })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Invoice Other Add Money</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Payment Method *</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Select Payment Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="mobile_banking">Mobile Banking</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Account *</Label>
            <Select value={account} onValueChange={setAccount}>
              <SelectTrigger>
                <SelectValue placeholder="Select Account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="main">Main Account</SelectItem>
                <SelectItem value="bank_1">Bank Account 1</SelectItem>
                <SelectItem value="cashbox">Cashbox</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Net Total:</Label>
            <Input value={netTotal.toString()} readOnly />
          </div>
          <div className="space-y-2">
            <Label>Paid:</Label>
            <Input value={paid.toString()} readOnly />
          </div>
          <div className="space-y-2">
            <Label>Due:</Label>
            <Input value={due.toString()} readOnly />
          </div>

          <div className="space-y-2">
            <Label>Amount *</Label>
            <Input placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Discount</Label>
            <Input placeholder="Discount" value={discount} onChange={(e) => setDiscount(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Payment Date *</Label>
            <DateInput value={paymentDate} onChange={setPaymentDate} />
          </div>

          <div className="space-y-2">
            <Label>Manual Money receipt no</Label>
            <Input placeholder="Manual Money receipt no" value={manualReceiptNo} onChange={(e) => setManualReceiptNo(e.target.value)} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Note</Label>
            <Input placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleOk} disabled={!isValid()} className="bg-blue-600 hover:bg-blue-700">OK</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}