"use client"

import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { DateInput } from "@/components/ui/date-input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import VendorSelect from "@/components/vendors/vendor-select"
import type { AccountType } from "@/components/accounts/types"
import { useInvoiceLookups } from "@/hooks/useInvoiceLookups"

type FormValues = {
  vendorId: string
  vendorName?: string
  paymentMethod: string
  accountId: string
  accountName?: string
  advanceAmount: string
  presentBalance?: string
  availableBalance?: string
  returnDate: string
  returnNote?: string
  receiptNo?: string
  transactionCharge?: string
}

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  mode: "add" | "edit"
  initialValues?: Partial<FormValues>
  onSubmit: (values: FormValues) => void
}

export default function VendorAdvanceReturnModal({ open, onOpenChange, mode, initialValues, onSubmit }: Props) {
  const { lookups } = useInvoiceLookups()
  const { register, setValue, handleSubmit, reset, watch, setError, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      vendorId: "",
      paymentMethod: "Cash",
      accountId: "",
      advanceAmount: "",
      presentBalance: "0",
      availableBalance: "",
      returnDate: new Date().toISOString().slice(0, 10),
      returnNote: "",
      receiptNo: "",
      transactionCharge: "",
      ...initialValues,
    },
  })

  const makeDefaults = () => ({
    vendorId: "",
    paymentMethod: "Cash",
    accountId: "",
    advanceAmount: "",
    presentBalance: "0",
    availableBalance: "",
    returnDate: new Date().toISOString().slice(0, 10),
    returnNote: "",
    receiptNo: "",
    transactionCharge: "",
  })

  const [paymentMethodOptions, setPaymentMethodOptions] = useState<AccountType[]>([])
  const [submitting, setSubmitting] = useState(false)

  // Fetch Payment Methods
  useEffect(() => {
    if (!open) return
    const ctrl = new AbortController()
      ; (async () => {
        try {
          const res = await fetch(`/api/account-types`, { signal: ctrl.signal })
          const data = await res.json()
          const items: string[] = Array.isArray(data?.items) ? data.items.map((i: any) => String(i.name)) : []
          setPaymentMethodOptions(items.length ? items : ["Cash", "Bank", "Mobile banking", "Credit Card"])
        } catch {
          setPaymentMethodOptions(["Cash", "Bank", "Mobile banking", "Credit Card"])
        }
      })()
    return () => ctrl.abort()
  }, [open])

  const accounts = useMemo(() => lookups?.accounts || [], [lookups])
  const vendors = useMemo(() => lookups?.vendors || [], [lookups])

  const paymentMethod = watch("paymentMethod") as AccountType | ""
  const filteredAccounts = useMemo(
    () => accounts.filter(a => (paymentMethod ? a.type === paymentMethod : true)),
    [accounts, paymentMethod]
  )

  useEffect(() => {
    if (!paymentMethod) setValue("accountId", "")
    else {
      const acc = watch("accountId")
      const ids = filteredAccounts.map(a => a.id)
      if (acc && !ids.includes(acc)) setValue("accountId", "")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentMethod, accounts])

  useEffect(() => {
    if (initialValues) {
      reset({ ...watch(), ...initialValues })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues])

  useEffect(() => {
    if (open && mode === "add") {
      reset(makeDefaults())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode])

  // Resolve Vendor and Account names for Edit Mode
  useEffect(() => {
    if (!open || mode !== "edit") return
    const hasVendorId = !!watch("vendorId")
    const hasAccountId = !!watch("accountId")
    if (!hasVendorId && initialValues?.vendorName) {
      const found = vendors.find(c => c.name === initialValues.vendorName)
      if (found) {
        setValue("vendorId", found.id, { shouldValidate: true })
        setValue("vendorName", found.name)
      }
    }
    if (!hasAccountId && initialValues?.accountName) {
      const foundAcc = accounts.find(a => a.name === initialValues.accountName)
      if (foundAcc) {
        setValue("accountId", foundAcc.id, { shouldValidate: true })
        setValue("accountName", foundAcc.name)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, vendors, accounts, initialValues])

  // Fetch Vendor Balance when Vendor Changed
  useEffect(() => {
    const vendorId = watch("vendorId")
    if (vendorId) {
      (async () => {
        try {
          const res = await fetch(`/api/vendors/${vendorId}`)
          if (res.ok) {
            const data = await res.json()
            const v = data.vendor
            if (v && v.presentBalance) {
               const type = v.presentBalance.type
               const amt = v.presentBalance.amount
               setValue("presentBalance", type === 'advance' ? `Adv: ${amt}` : `Due: ${amt}`)
            } else {
               setValue("presentBalance", "0")
            }
          }
        } catch {
           setValue("presentBalance", "0")
        }
      })()
    } else {
      setValue("presentBalance", "0")
    }
  }, [watch("vendorId")])
  useEffect(() => {
    const accId = watch("accountId")
    const acc = filteredAccounts.find(a => a.id === accId)
    if (acc && typeof acc.lastBalance === "number") {
      setValue("availableBalance", String(acc.lastBalance))
    } else {
      setValue("availableBalance", "")
    }
  }, [watch("accountId"), filteredAccounts])

  const onSubmitInternal = async (vals: FormValues) => {
    if (!vals.vendorId) {
      setError("vendorId", { type: "required", message: "Vendor is required" })
      return
    }
    const acc = filteredAccounts.find(a => a.id === vals.accountId)
    setValue("accountName", acc?.name || "")
    try {
      setSubmitting(true)
      await onSubmit({ ...vals, accountName: acc?.name || "" })
      if (mode === "add") reset(makeDefaults())
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  const requiredMark = (label: string, required?: boolean) => (
    <span>
      {required && <span className="text-red-500 mr-1">*</span>}{label}
    </span>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[920px]">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Return Advance Payment" : "Edit Advance Return"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmitInternal)}>
          <div className="rounded-md border bg-gray-50 p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{requiredMark("Select vendor:", true)}</Label>
                  <VendorSelect
                    value={watch("vendorId")}
                    preloaded={vendors}
                    placeholder="Select Vendor"
                    onChange={(id, selected) => {
                      setValue("vendorId", id || "", { shouldValidate: true })
                      setValue("vendorName", selected?.name || "")
                    }}
                  />
                  {errors.vendorId && <div className="text-red-500 text-xs">Vendor is required</div>}
                </div>

                <div className="space-y-2">
                  <Label>Payment method:</Label>
                  <Select value={watch("paymentMethod")} onValueChange={(v) => setValue("paymentMethod", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethodOptions.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{requiredMark("Select account:", true)}</Label>
                  <Select value={watch("accountId")} onValueChange={(v) => setValue("accountId", v, { shouldValidate: true })} disabled={!paymentMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an account" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredAccounts.map((a) => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  {errors.accountId && <div className="text-red-500 text-xs">Account is required</div>}
                </div>

                <div className="space-y-2">
                  <Label>{requiredMark("Return date:", true)}</Label>
                  <DateInput
                    value={watch("returnDate") ? new Date(watch("returnDate")) : undefined}
                    onChange={(d) => setValue("returnDate", d ? d.toISOString().slice(0, 10) : "", { shouldValidate: true })}
                  />
                  {errors.returnDate && <div className="text-red-500 text-xs">Date is required</div>}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Present balance:</Label>
                  <Input readOnly value={watch("presentBalance")} className="bg-gray-100" />
                </div>

                <div className="space-y-2">
                  <Label>Available Balance:</Label>
                  <Input readOnly value={watch("availableBalance")} className="bg-gray-100" />
                </div>

                <div className="space-y-2">
                  <Label>{requiredMark("Advance amount:", true)}</Label>
                  <Input 
                    type="number" 
                    placeholder="Advance amount" 
                    {...register("advanceAmount", { required: true, min: 0 })} 
                  />
                  {errors.advanceAmount && <div className="text-red-500 text-xs">Amount is required</div>}
                </div>

                <div className="space-y-2">
                  <Label>Return note:</Label>
                  <Textarea placeholder="Note something" {...register("returnNote")} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-6">
             <Button type="submit" className="bg-sky-500 hover:bg-sky-600" disabled={submitting}>
                {submitting ? "Processing..." : "Return Advance Payment"}
             </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
