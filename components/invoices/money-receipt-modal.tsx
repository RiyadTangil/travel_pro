"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DateInput } from "@/components/ui/date-input"
import { useState, useEffect, useMemo } from "react"
import { Invoice } from "@/types/invoice"
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"

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

interface AccountOptionItem { id: string; name: string; type: string }

export function MoneyReceiptModal({ open, onClose, invoice, onSubmit }: MoneyReceiptModalProps) {
  const { toast } = useToast()
  const [paymentMethod, setPaymentMethod] = useState("")
  const [paymentMethodOptions, setPaymentMethodOptions] = useState<string[]>([])
  const [accounts, setAccounts] = useState<AccountOptionItem[]>([])
  const [account, setAccount] = useState("")
  const [amount, setAmount] = useState<string>("")
  const [discount, setDiscount] = useState<string>("")
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(new Date())
  const [manualReceiptNo, setManualReceiptNo] = useState("")
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(false)

  // Fetch account types and accounts
  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    ;(async () => {
      try {
        const [typeRes, accRes] = await Promise.all([
          fetch('/api/account-types', { signal: controller.signal }),
          fetch('/api/accounts?pageSize=200', { signal: controller.signal })
        ])
        const [typeData, accData] = await Promise.all([typeRes.json(), accRes.json()])
        
        setPaymentMethodOptions(Array.isArray(typeData?.items) ? typeData.items.map((i: any) => i.name) : ["Cash", "Bank", "Mobile banking"])
        setAccounts(Array.isArray(accData?.items) ? accData.items.map((a: any) => ({ id: a._id || a.id, name: a.name, type: a.type })) : [])
      } catch (e) {}
    })()
    return () => controller.abort()
  }, [open])

  const filteredAccounts = useMemo(() => {
    if (!paymentMethod) return []
    return accounts.filter(a => a.type.toLowerCase() === paymentMethod.toLowerCase())
  }, [accounts, paymentMethod])

  useEffect(() => {
    if (open) {
      setPaymentMethod("")
      setAccount("")
      setAmount("")
      setDiscount("")
      setPaymentDate(new Date())
      setManualReceiptNo("")
      setNote("")
      setLoading(false)
    }
  }, [open])

  const netTotal = invoice ? invoice.salesPrice : 0
  const paid = invoice ? invoice.receivedAmount : 0
  const due = Math.max(0, netTotal - paid)

  const isValid = () => {
    return paymentMethod && account && amount && paymentDate && !loading
  }

  const handleOk = async () => {
    if (!isValid() || !invoice) return
    
    setLoading(true)
    try {
      const selectedAcc = accounts.find(a => a.id === account)
      const payload = {
        clientId: (invoice as any).clientId,
        invoiceId: invoice.id,
        paymentTo: "invoice",
        paymentMethod,
        accountId: selectedAcc?.id || account,
        amount: parseFloat(amount || "0") || 0,
        discount: parseFloat(discount || "0") || 0,
        paymentDate: paymentDate?.toISOString().slice(0, 10),
        manualReceiptNo,
        note
      }

      const res = await fetch('/api/money-receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create money receipt")
      }

      toast({
        title: "Success",
        description: "Money receipt created successfully"
      })
      
      onSubmit?.({
        invoiceId: invoice.id,
        paymentMethod,
        account,
        amount: parseFloat(amount || "0") || 0,
        discount: parseFloat(discount || "0") || 0,
        paymentDate,
        manualReceiptNo,
        note
      })
      onClose()
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !loading && onClose()}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Invoice Money Receipt</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Payment Method *</Label>
            <Select value={paymentMethod} onValueChange={(v) => { setPaymentMethod(v); setAccount("") }}>
              <SelectTrigger>
                <SelectValue placeholder="Select Payment Method" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethodOptions.map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Account *</Label>
            <Select value={account} onValueChange={setAccount} disabled={!paymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Select Account" />
              </SelectTrigger>
              <SelectContent>
                {filteredAccounts.map(acc => (
                  <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Net Total:</Label>
            <Input value={netTotal.toFixed(2)} readOnly className="bg-gray-50" />
          </div>
          <div className="space-y-2">
            <Label>Paid:</Label>
            <Input value={paid.toFixed(2)} readOnly className="bg-gray-50" />
          </div>
          <div className="space-y-2">
            <Label className="text-red-600 font-bold">Due:</Label>
            <Input value={due.toFixed(2)} readOnly className="bg-red-50 text-red-600 font-bold" />
          </div>

          <div className="space-y-2">
            <Label>Amount *</Label>
            <Input placeholder="Amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Discount</Label>
            <Input placeholder="Discount" type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Payment Date *</Label>
            <DateInput value={paymentDate} onChange={setPaymentDate} />
          </div>

          <div className="space-y-2">
            <Label>Manual Receipt no</Label>
            <Input placeholder="Manual Receipt no" value={manualReceiptNo} onChange={(e) => setManualReceiptNo(e.target.value)} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Note</Label>
            <Input placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleOk} disabled={!isValid()} className="bg-blue-600 hover:bg-blue-700 min-w-[80px]">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}