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
import { Loader2 } from "lucide-react"
import type { AccountType } from "@/components/accounts/types"
import axios from "axios"
import { useSession } from "next-auth/react"

type FormValues = {
  companyId: string
  paymentMethod: string
  accountId: string
  amount: string
  date: string
  note?: string
}

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  mode: "add" | "edit"
  initialValues?: Partial<FormValues> & { companyName?: string, accountName?: string }
  onSubmit: (values: FormValues) => Promise<boolean>
}

export default function InvestmentModal({ open, onOpenChange, mode, initialValues, onSubmit }: Props) {
  const { data: session } = useSession()
  const { register, setValue, handleSubmit, reset, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      companyId: "",
      paymentMethod: "",
      accountId: "",
      amount: "",
      date: new Date().toISOString().slice(0, 10),
      note: "",
      ...initialValues,
    },
  })

  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([])
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string; type: AccountType }>>([])
  const [paymentMethodOptions, setPaymentMethodOptions] = useState<AccountType[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [loadingAccounts, setLoadingAccounts] = useState(false)

  const client = axios.create({
    baseURL: "",
    headers: { "x-company-id": session?.user?.companyId ?? "" },
  })

  useEffect(() => {
    if (!open) return
    const fetchCompanies = async () => {
      try {
        const res = await client.get("/api/configuration/companies?page=1&pageSize=100")
        const items = res.data?.items || []
        setCompanies(items.map((i: any) => ({ id: i.id, name: i.name })))
      } catch {}
    }
    fetchCompanies()
  }, [open, session])

  useEffect(() => {
    if (!open) return
    const fetchAccounts = async () => {
      setLoadingAccounts(true)
      try {
        const res = await client.get("/api/accounts?page=1&pageSize=100")
        const items = res.data?.items || []
        setAccounts(items.map((i: any) => ({
          id: String(i.id || i._id),
          name: i.bankName ? `${i.name} (${i.bankName})` : String(i.name || ""),
          type: String(i.type || "Cash") as AccountType,
        })))
      } catch {} finally {
        setLoadingAccounts(false)
      }
    }
    fetchAccounts()
  }, [open, session])

  useEffect(() => {
    if (!open) return
    const fetchTypes = async () => {
      try {
        const res = await client.get("/api/account-types")
        const items: string[] = Array.isArray(res.data?.items) ? res.data.items.map((i: any) => String(i.name)) : []
        setPaymentMethodOptions(items.length ? items : ["Cash", "Bank", "Mobile banking", "Credit Card"])
      } catch {
        setPaymentMethodOptions(["Cash", "Bank", "Mobile banking", "Credit Card"])
      }
    }
    fetchTypes()
  }, [open, session])

  const paymentMethod = watch("paymentMethod") as AccountType | ""
  const filteredAccounts = useMemo(
    () => accounts.filter(a => (paymentMethod ? a.type === paymentMethod : true)),
    [accounts, paymentMethod]
  )

  useEffect(() => {
    if (loadingAccounts) return

    if (!paymentMethod) setValue("accountId", "")
    else {
      const acc = watch("accountId")
      const ids = filteredAccounts.map(a => a.id)
      if (acc && !ids.includes(acc)) setValue("accountId", "")
    }
  }, [paymentMethod, accounts, loadingAccounts])

  useEffect(() => {
    if (open) {
        reset({
            companyId: "",
            paymentMethod: "",
            accountId: "",
            amount: "",
            date: new Date().toISOString().slice(0, 10),
            note: "",
            ...initialValues
        })
    }
  }, [open, initialValues, reset])

  const onSubmitInternal = async (vals: FormValues) => {
    try {
      setSubmitting(true)
      const ok = await onSubmit(vals)
      if (ok) {
        onOpenChange(false)
        reset()
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
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add Investment" : "Edit Investment"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmitInternal)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>{requiredMark("Company:", true)}</Label>
                  <Select value={watch("companyId")} onValueChange={(v) => setValue("companyId", v, { shouldValidate: true })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Company" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  {errors.companyId && <div className="text-red-500 text-xs">Company is required</div>}
                </div>

                <div className="space-y-2">
                  <Label>Payment Method:</Label>
                  <Select value={watch("paymentMethod")} onValueChange={(v) => setValue("paymentMethod", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Payment Method" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethodOptions.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{requiredMark("Account:", true)}</Label>
                  <Select value={watch("accountId")} onValueChange={(v) => setValue("accountId", v, { shouldValidate: true })} disabled={!paymentMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Account" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredAccounts.map((a) => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  {errors.accountId && <div className="text-red-500 text-xs">Account is required</div>}
                </div>

                <div className="space-y-2">
                  <Label>{requiredMark("Amount:", true)}</Label>
                  <Input type="number" step="0.01" placeholder="Amount" {...register("amount", { required: "Amount is required" })} />
                  {errors.amount && <div className="text-red-500 text-xs">{errors.amount.message}</div>}
                </div>

                <div className="space-y-2">
                  <Label>{requiredMark("Date:", true)}</Label>
                  <DateInput
                    value={watch("date") ? new Date(watch("date")) : undefined}
                    onChange={(d) => setValue("date", d ? d.toISOString().slice(0, 10) : "", { shouldValidate: true })}
                  />
                  {errors.date && <div className="text-red-500 text-xs">Date is required</div>}
                </div>
            </div>

            <div className="space-y-2">
                <Label>Note:</Label>
                <Textarea rows={3} placeholder="Note something" {...register("note")} />
            </div>

            <div className="pt-2">
                <Button type="submit" className="bg-sky-500 hover:bg-sky-600 w-full md:w-auto" disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {mode === "add" ? "Add Investment" : "Update"}
                </Button>
            </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
