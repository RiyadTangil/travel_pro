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
import { cn } from "@/lib/utils"
import { SharedModal } from "@/components/shared/shared-modal"

import { useSession } from "next-auth/react"

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
  loading?: boolean
}

type AccountOptionItem = {
  id: string
  name: string
  type: string
  lastBalance?: number
}

export default function VendorAdvanceReturnModal({ open, onOpenChange, mode, initialValues, onSubmit, loading = false }: Props) {
  const { data: session } = useSession()
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
  const [accounts, setAccounts] = useState<AccountOptionItem[]>([])
  const [submitAttempted, setSubmitAttempted] = useState(false)

  // Fetch Payment Methods and Accounts
  useEffect(() => {
    if (!open) {
      setSubmitAttempted(false)
      return
    }
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

    ;(async () => {
      try {
        const res = await fetch(`/api/accounts?page=1&pageSize=100`, { 
          signal: ctrl.signal,
          headers: { "x-company-id": session?.user?.companyId ?? "" }
        })
        const data = await res.json()
        const items = Array.isArray(data?.items) ? data.items : []
        const mapped = items.map((i: any) => ({
          id: String(i.id || i._id),
          name: i.bankName ? `${i.name} (${i.bankName})` : String(i.name || ""),
          type: String(i.type || "Cash"),
          lastBalance: typeof i.lastBalance === "number" ? i.lastBalance : Number(i.lastBalance || 0),
        }))
        setAccounts(mapped)
      } catch (e) {
        console.error("Failed to fetch accounts", e)
      }
    })()

    return () => ctrl.abort()
  }, [open, session?.user?.companyId])

  const vendors = useMemo(() => lookups?.vendors || [], [lookups])

  const paymentMethod = watch("paymentMethod")
  const filteredAccounts = useMemo(() => {
    if (!accounts || !paymentMethod) return []
    return accounts.filter(a => a.type === paymentMethod)
  }, [accounts, paymentMethod])

  useEffect(() => {
    if (!paymentMethod) setValue("accountId", "")
    else {
      const acc = watch("accountId")
      const ids = filteredAccounts.map(a => a.id)
      if (acc && !ids.includes(acc)) setValue("accountId", "")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentMethod, filteredAccounts])

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
    setSubmitAttempted(true)
    if (!vals.vendorId) {
      setError("vendorId", { type: "required", message: "Vendor is required" })
      return
    }
    if (!vals.paymentMethod) {
      setError("paymentMethod", { type: "required", message: "Required" })
      return
    }
    if (!vals.accountId) {
      setError("accountId", { type: "required", message: "Account is required" })
      return
    }
    if (!vals.returnDate) {
      setError("returnDate", { type: "required", message: "Date is required" })
      return
    }
    const amt = Number(vals.advanceAmount)
    if (!vals.advanceAmount || !Number.isFinite(amt) || amt <= 0) {
      setError("advanceAmount", { type: "required", message: "Enter a valid amount" })
      return
    }
    const acc = filteredAccounts.find(a => a.id === vals.accountId)
    setValue("accountName", acc?.name || "")

    await onSubmit({ ...vals, accountName: acc?.name || "" })
  }

  const requiredMark = (label: string, required?: boolean) => (
    <span>
      {required && <span className="text-red-500 mr-1">*</span>}{label}
    </span>
  )

  return (
    <SharedModal
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "add" ? "Return Advance Payment" : "Edit Advance Return"}
      maxWidth="max-w-[920px]"
      formId="vendor-advance-return-form"
      submitText={mode === "add" ? "Return Advance Payment" : "Save Changes"}
      cancelText="Cancel"
      loading={loading}
    >
      <form id="vendor-advance-return-form" onSubmit={handleSubmit(onSubmitInternal)}>
        <div className="rounded-md border bg-gray-50 p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{requiredMark("Select vendor:", true)}</Label>
                <div className={cn(submitAttempted && errors.vendorId && "rounded-md ring-2 ring-red-500 ring-offset-2 p-1")}>
                  <VendorSelect
                    value={watch("vendorId")}
                    preloaded={vendors}
                    placeholder="Select Vendor"
                    onChange={(id, selected) => {
                      setValue("vendorId", id || "", { shouldValidate: true })
                      setValue("vendorName", selected?.name || "")
                    }}
                  />
                </div>
                {errors.vendorId && <div className="text-red-500 text-xs">Vendor is required</div>}
              </div>

              <div className="space-y-2">
                <Label>{requiredMark("Payment method:", true)}</Label>
                <Select value={watch("paymentMethod")} onValueChange={(v) => setValue("paymentMethod", v)}>
                  <SelectTrigger className={cn(submitAttempted && errors.paymentMethod && "border-red-500 focus:ring-red-500")}>
                    <SelectValue placeholder="Select Payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethodOptions.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                  </SelectContent>
                </Select>
                {errors.paymentMethod && <div className="text-red-500 text-xs">Payment method is required</div>}
              </div>

              <div className="space-y-2">
                <Label>{requiredMark("Select account:", true)}</Label>
                <Select value={watch("accountId")} onValueChange={(v) => setValue("accountId", v, { shouldValidate: true })} disabled={!paymentMethod}>
                  <SelectTrigger className={cn(submitAttempted && errors.accountId && "border-red-500 focus:ring-red-500")}>
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
                  className={cn(submitAttempted && errors.returnDate && "border-red-500 ring-red-500")}
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
                  className={cn(submitAttempted && errors.advanceAmount && "border-red-500 focus-visible:ring-red-500")}
                />
                {errors.advanceAmount && <div className="text-red-500 text-xs">{errors.advanceAmount.message || "Amount is required"}</div>}
              </div>

              <div className="space-y-2">
                <Label>Return note:</Label>
                <Textarea placeholder="Note something" {...register("returnNote")} />
              </div>
            </div>
          </div>
        </div>
      </form>
    </SharedModal>
  )
}
