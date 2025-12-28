"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DateInput } from "@/components/ui/date-input"

type InvoiceItem = { id: string; invoiceNo: string; salesDate: string; salesPrice: number; receivedAmount: number; dueAmount: number }

type Row = {
  invoiceId: string
  invoiceNo: string
  salesDate: string
  netTotal: number
  paid: number
  due: number
  amount: number
  paymentDate: string
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  paymentDate: string
  remainingAmount: number
  clientId?: string
  onSubmit: (rows: Row[]) => void
  voucherNo?: string
  clientName?: string
}

export default function ReceiptAdjustModal({ open, onOpenChange, paymentDate, remainingAmount, clientId, onSubmit, voucherNo, clientName }: Props) {
  const [rows, setRows] = useState<Row[]>([])
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([])
  const [loading, setLoading] = useState(false)
  const [dateVal, setDateVal] = useState(paymentDate ? new Date(paymentDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10))

  const totalAlloc = useMemo(() => rows.reduce((s, r) => s + Number(r.amount || 0), 0), [rows])
  const remainAfter = Math.max(0, remainingAmount - totalAlloc)

  useEffect(() => {
    if (!open) return
    setRows([{ invoiceId: "", invoiceNo: "", salesDate: "", netTotal: 0, paid: 0, due: 0, amount: 0, paymentDate: dateVal }])
  }, [open])

  useEffect(() => {
    if (!open || !clientId) { setInvoiceItems([]); return }
    const ctrl = new AbortController()
      ; (async () => {
        try {
          setLoading(true)
          const res = await fetch(`/api/invoices?page=1&pageSize=50&clientId=${encodeURIComponent(clientId)}`, { signal: ctrl.signal })
          if (!res.ok) return
          const data = await res.json()
          const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data?.data?.items) ? data.data.items : [])
          const mapped: InvoiceItem[] = items.map((i: any) => ({ id: String(i.id), invoiceNo: String(i.invoiceNo || ""), salesDate: String(i.salesDate || ""), salesPrice: Number(i.salesPrice || 0), receivedAmount: Number(i.receivedAmount || 0), dueAmount: Number(i.dueAmount || 0) }))
          setInvoiceItems(mapped)
        } finally { setLoading(false) }
      })()
    return () => ctrl.abort()
  }, [open, clientId])

  const setRowInvoice = (idx: number, invoiceId: string) => {
    const inv = invoiceItems.find(i => i.id === invoiceId)
    setRows(prev => prev.map((r, i) => i === idx ? {
      ...r,
      invoiceId,
      invoiceNo: inv?.invoiceNo || "",
      salesDate: inv?.salesDate || "",
      netTotal: inv?.salesPrice || 0,
      paid: inv?.receivedAmount || 0,
      due: inv?.dueAmount || 0,
      amount: inv?.dueAmount || 0,
    } : r))
  }

  const setRowAmount = (idx: number, val: number) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, amount: Math.max(0, Math.min(val, r.due)) } : r))
  }

  const addField = () => setRows(prev => ([...prev, { invoiceId: "", invoiceNo: "", salesDate: "", netTotal: 0, paid: 0, due: 0, amount: 0, paymentDate: dateVal }]))

  const submit = () => {
    onSubmit(rows)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[70%] max-w-[70%]">
        <DialogHeader>
          <DialogTitle>Add Invoice</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label>Payment Date:</Label>
              <DateInput value={dateVal} onChange={(v) => { setDateVal(v); setRows(prev => prev.map(r => ({ ...r, paymentDate: v }))) }} />
            </div>
            <div className="font-semibold">Remaining Amount : {remainAfter}</div>
          </div>
          <div className="rounded-md border bg-gray-50 p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3">
              {rows.map((row, idx) => (
                <div key={idx} className="contents">
                  <div className="space-y-2">
                    <Label>Invoice No.</Label>
                    <Select value={row.invoiceId} onValueChange={(v) => setRowInvoice(idx, v)} disabled={loading || !invoiceItems.length}>
                      <SelectTrigger>
                        <SelectValue placeholder={loading ? "Loading..." : "Select Invoice No."} />
                      </SelectTrigger>
                      <SelectContent>
                        {invoiceItems.map(i => (
                          <SelectItem key={i.id} value={i.id}>{i.invoiceNo}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Invoice Date</Label>
                    <Input disabled placeholder="Invoice Date" value={row.salesDate ? String(row.salesDate).slice(0, 10) : ""} />
                  </div>
                  <div className="space-y-2">
                    <Label>Net Total</Label>
                    <Input disabled placeholder="Net Total" value={String(row.netTotal || 0)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Paid</Label>
                    <Input disabled placeholder="Paid" value={String(row.paid || 0)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Due</Label>
                    <Input disabled placeholder="0" value={String(row.due || 0)} />
                  </div>
                  <div className="space-y-2">
                    <Label><span className="text-destructive mr-1">*</span> Amount</Label>
                    <Input type="number" step="0.01" placeholder="Amount" value={row.amount ?? 0} onChange={(e) => setRowAmount(idx, Number(e.target.value || 0))} />
                  </div>
                </div>
              ))}
            </div>
            <Button type="button" variant="secondary" onClick={addField}>Add field</Button>
          </div>
          <div>
            <Button onClick={submit}>Submit</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

