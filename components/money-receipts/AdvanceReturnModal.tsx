"use client"

import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { DateInput } from "@/components/ui/date-input"
import ClientSelect from "@/components/clients/client-select"
import type { AccountType } from "@/components/accounts/types"

type FormValues = {
  clientId: string
  clientName?: string
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

export default function AdvanceReturnModal({ open, onOpenChange, mode, initialValues, onSubmit }: Props) {
  const { register, setValue, handleSubmit, reset, watch, setError, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      clientId: "",
      paymentMethod: "",
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
    clientId: "",
    paymentMethod: "",
    accountId: "",
    advanceAmount: "",
    presentBalance: "0",
    availableBalance: "",
    returnDate: new Date().toISOString().slice(0, 10),
    returnNote: "",
    receiptNo: "",
    transactionCharge: "",
  })

  const [clients, setClients] = useState<Array<{ id: string; name: string; presentBalance?: number }>>([])
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string; type: AccountType; lastBalance?: number }>>([])
  const [paymentMethodOptions, setPaymentMethodOptions] = useState<AccountType[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [clientAdvancePositive, setClientAdvancePositive] = useState<boolean>(false)

  useEffect(() => {
    if (!open) return
    const ctrl = new AbortController()
      ; (async () => {
        try {
          const res = await fetch(`/api/clients-manager?page=1&limit=50`, { signal: ctrl.signal })
          const data = await res.json()
          const arr = Array.isArray(data?.data) ? data.data : (Array.isArray(data?.clients) ? data.clients : [])
        const mapped = arr.map((c: any) => ({
          id: String(c.id || c._id),
          name: String(c.name || ""),
          presentBalance: typeof c.presentBalance === "number" ? c.presentBalance : Number(c.presentBalance || 0),
        }))
        setClients(mapped)
        } catch { }
      })()
    return () => ctrl.abort()
  }, [open])

  useEffect(() => {
    if (!open) return
    const ctrl = new AbortController()
      ; (async () => {
        try {
          const res = await fetch(`/api/accounts?page=1&pageSize=100`, { signal: ctrl.signal })
          const data = await res.json()
          const items = Array.isArray(data?.items) ? data.items : []
          const mapped = items.map((i: any) => ({
            id: String(i.id || i._id),
            name: i.bankName ? `${i.name} (${i.bankName})` : String(i.name || ""),
            type: String(i.type || "Cash") as AccountType,
            lastBalance: typeof i.lastBalance === "number" ? i.lastBalance : Number(i.lastBalance || 0),
          }))
          setAccounts(mapped)
        } catch { }
      })()
    return () => ctrl.abort()
  }, [open])

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
    if (!open && mode === "add") {
      reset(makeDefaults())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode])

  useEffect(() => {
    if (!open || mode !== "edit") return
    const hasClientId = !!watch("clientId")
    const hasAccountId = !!watch("accountId")
    if (!hasClientId && initialValues?.clientName) {
      const found = clients.find(c => c.name === initialValues.clientName)
      if (found) {
        setValue("clientId", found.id, { shouldValidate: true })
        setValue("clientName", found.name)
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
  }, [open, mode, clients, accounts, initialValues])

  useEffect(() => {
    const clientId = watch("clientId")
    const accId = watch("accountId")
    ;(async () => {
      try {
        if (!clientId) {
          setClientAdvancePositive(false)
          setValue("presentBalance", "0")
        } else {
          const client = clients.find(c => c.id === clientId)
          const pb = typeof client?.presentBalance === "number" ? client.presentBalance : 0
          setValue("presentBalance", String(pb.toFixed(2)))
          setClientAdvancePositive(pb > 0)
        }
      } catch {
        setClientAdvancePositive(false)
      }
      const acc = filteredAccounts.find(a => a.id === accId)
      if (acc && typeof acc.lastBalance === "number") {
        setValue("availableBalance", String(acc.lastBalance))
      } else {
        setValue("availableBalance", "")
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watch("clientId"), watch("accountId"), filteredAccounts, clients])

  const onSubmitInternal = async (vals: FormValues) => {
    if (!vals.clientId) {
      setError("clientId", { type: "required", message: "Client is required" })
      return
    }
    const acc = filteredAccounts.find(a => a.id === vals.accountId)
    setValue("accountName", acc?.name || "")
    try {
      setSubmitting(true)
      const ok = await Promise.resolve(onSubmit({ ...vals, accountName: acc?.name || "" }) as any)
      if (ok) {
        if (mode === "add") reset(makeDefaults())
        onOpenChange(false)
      }
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
          <DialogTitle>{mode === "add" ? "Return to Advanced Payment List" : "Edit Advance Return"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmitInternal)}>
          <div className="rounded-md border bg-gray-50 p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{requiredMark("Select Client:", true)}</Label>
                  <ClientSelect
                    value={watch("clientId")}
                    preloaded={clients as any}
                    placeholder="Select client"
                    disabled={mode === "edit"}
                    onChange={(id, selected) => {
                      setValue("clientId", id || "", { shouldValidate: true })
                      setValue("clientName", selected?.name || "")
                    }}
                  />
                  {errors.clientId && <div className="text-red-500 text-xs">Client is required</div>}
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

                {mode === "edit" && (
                  <div className="space-y-2">
                    <Label>Receipt/Trans No:</Label>
                    <Input placeholder="Receipt/Trans No :" {...register("receiptNo")} />
                  </div>
                )}

                {mode === "edit" && (
                  <div className="space-y-2">
                    <Label>Transaction charge:</Label>
                    <Input placeholder="Transaction charge" {...register("transactionCharge")} />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>{requiredMark("Advance amount:", true)}</Label>
                  <Input type="number" step="0.01" placeholder="Advance amount" {...register("advanceAmount", { required: true })} />
                  {errors.advanceAmount && <div className="text-red-500 text-xs">Advance amount is required</div>}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{clientAdvancePositive ? "Advance:" : " Present balance :"}</Label>
                  <Input placeholder="0" readOnly={clientAdvancePositive} {...register("presentBalance")} />
                </div>
                <div className="space-y-2">
                  <Label>Available Balance:</Label>
                  <Input placeholder="Available Balance" readOnly {...register("availableBalance")} />
                </div>
                <div className="space-y-2">
                  <Label>{requiredMark("Return date:", true)}</Label>
                  <DateInput
                    value={watch("returnDate") ? new Date(watch("returnDate")) : undefined}
                    onChange={(d) => setValue("returnDate", d ? d.toISOString().slice(0, 10) : "", { shouldValidate: true })}
                  />
                  {errors.returnDate && <div className="text-red-500 text-xs">Return date is required</div>}
                </div>
                <div className="space-y-2">
                  <Label>Return note:</Label>
                  <Textarea rows={3} placeholder="Note something" {...register("returnNote")} />
                </div>

                <div className="flex justify-end">
                  <Button type="submit" className="bg-sky-500 hover:bg-sky-600">
                    {submitting ? (mode === "add" ? "Submitting..." : "Updating...") : (mode === "add" ? "Return Advance Payment" : "Update")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
