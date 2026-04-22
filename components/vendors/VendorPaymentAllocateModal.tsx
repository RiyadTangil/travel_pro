"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DateInput } from "@/components/ui/date-input"
import { Loader2 } from "lucide-react"

type InvoiceOption = {
  id: string
  invoiceNo: string
  salesDate: string
  totalCost: number
  paid: number
  due: number
}

type Row = {
  invoiceId: string
  invoiceNo: string
  salesDate: string
  totalCost: number
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
  vendorId: string
  companyId: string
  voucherNo?: string
  vendorName?: string
  onSubmit: (rows: Row[]) => Promise<void>
}

export default function VendorPaymentAllocateModal({
  open,
  onOpenChange,
  paymentDate,
  remainingAmount,
  vendorId,
  companyId,
  voucherNo,
  vendorName,
  onSubmit,
}: Props) {
  const [rows, setRows] = useState<Row[]>([])
  const [invoiceOptions, setInvoiceOptions] = useState<InvoiceOption[]>([])
  const [fetchingInvoices, setFetchingInvoices] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const toDateObj = (val: string) => {
    const d = new Date(val)
    return isNaN(d.getTime()) ? new Date() : d
  }

  const [dateVal, setDateVal] = useState<Date | undefined>(() => toDateObj(paymentDate))

  const isoDate = (d: Date | undefined) => (d ? d.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10))

  const totalAlloc = useMemo(() => rows.reduce((s, r) => s + Number(r.amount || 0), 0), [rows])
  const remainAfter = Math.max(0, remainingAmount - totalAlloc)

  // Reset state when modal opens
  useEffect(() => {
    if (!open) return
    const d = toDateObj(paymentDate)
    setDateVal(d)
    setRows([emptyRow(isoDate(d))])
  }, [open])

  // Fetch vendor invoices
  useEffect(() => {
    if (!open || !vendorId || !companyId) {
      setInvoiceOptions([])
      return
    }
    const ctrl = new AbortController()
    ;(async () => {
      try {
        setFetchingInvoices(true)
        const res = await fetch(`/api/vendors/${vendorId}/invoices`, {
          signal: ctrl.signal,
          headers: { "x-company-id": companyId },
        })
        if (!res.ok) return
        const data = await res.json()
        const items: InvoiceOption[] = (Array.isArray(data?.items) ? data.items : []).map(
          (i: any) => ({
            id: String(i.id),
            invoiceNo: String(i.invoiceNo || ""),
            salesDate: String(i.salesDate || ""),
            totalCost: Number(i.totalCost || 0),
            paid: Number(i.paid || 0),
            due: Number(i.due || 0),
          })
        )
        setInvoiceOptions(items)
      } finally {
        setFetchingInvoices(false)
      }
    })()
    return () => ctrl.abort()
  }, [open, vendorId, companyId])

  function emptyRow(date: string): Row {
    return { invoiceId: "", invoiceNo: "", salesDate: "", totalCost: 0, paid: 0, due: 0, amount: 0, paymentDate: date }
  }

  const setRowInvoice = (idx: number, invoiceId: string) => {
    const inv = invoiceOptions.find((i) => i.id === invoiceId)
    setRows((prev) =>
      prev.map((r, i) =>
        i === idx
          ? {
              ...r,
              invoiceId,
              invoiceNo: inv?.invoiceNo || "",
              salesDate: inv?.salesDate || "",
              totalCost: inv?.totalCost || 0,
              paid: inv?.paid || 0,
              due: inv?.due || 0,
              amount: inv?.due || 0,
            }
          : r
      )
    )
  }

  const setRowAmount = (idx: number, val: number) => {
    setRows((prev) =>
      prev.map((r, i) =>
        i === idx ? { ...r, amount: Math.max(0, Math.min(val, r.due)) } : r
      )
    )
  }

  const addField = () => setRows((prev) => [...prev, emptyRow(isoDate(dateVal))])

  const handleDateChange = (d: Date | undefined) => {
    setDateVal(d)
    const iso = isoDate(d)
    setRows((prev) => prev.map((r) => ({ ...r, paymentDate: iso })))
  }

  const handleSubmit = async () => {
    const validRows = rows.filter((r) => r.invoiceId && r.amount > 0)
    if (!validRows.length) return
    try {
      setSubmitting(true)
      await onSubmit(validRows)
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[70%] max-w-[70%]">
        <DialogHeader>
          <DialogTitle>
            Allocate Payment{vendorName ? ` — ${vendorName}` : ""}
            {voucherNo ? <span className="text-muted-foreground text-sm ml-2">({voucherNo})</span> : null}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label>Payment Date:</Label>
              <DateInput value={dateVal} onChange={handleDateChange} />
            </div>
            <div className="font-semibold">
              Remaining Amount: <span className="text-green-600">{remainAfter.toLocaleString()}</span>
            </div>
          </div>

          <div className="rounded-md border bg-gray-50 p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3">
              {rows.map((row, idx) => (
                <div key={idx} className="contents">
                  <div className="space-y-2">
                    <Label>Invoice No.</Label>
                    <Select
                      value={row.invoiceId}
                      onValueChange={(v) => setRowInvoice(idx, v)}
                      disabled={fetchingInvoices || !invoiceOptions.length}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={fetchingInvoices ? "Loading..." : "Select Invoice"} />
                      </SelectTrigger>
                      <SelectContent>
                        {invoiceOptions.map((i) => (
                          <SelectItem key={i.id} value={i.id}>
                            {i.invoiceNo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Invoice Date</Label>
                    <Input
                      disabled
                      placeholder="Invoice Date"
                      value={row.salesDate ? String(row.salesDate).slice(0, 10) : ""}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Total Cost</Label>
                    <Input disabled placeholder="Total Cost" value={row.totalCost.toLocaleString()} />
                  </div>

                  <div className="space-y-2">
                    <Label>Paid</Label>
                    <Input disabled placeholder="Paid" value={row.paid.toLocaleString()} />
                  </div>

                  <div className="space-y-2">
                    <Label>Due</Label>
                    <Input disabled placeholder="0" value={row.due.toLocaleString()} />
                  </div>

                  <div className="space-y-2">
                    <Label>
                      <span className="text-destructive mr-1">*</span>Amount
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Amount"
                      value={row.amount ?? 0}
                      onChange={(e) => setRowAmount(idx, Number(e.target.value || 0))}
                    />
                  </div>
                </div>
              ))}
            </div>
            <Button type="button" variant="secondary" onClick={addField} disabled={submitting}>
              Add field
            </Button>
          </div>

          <div>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
