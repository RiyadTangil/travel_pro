"use client"

import { useEffect, useMemo, useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { DateInput } from "@/components/ui/date-input"
import { Upload, X, Trash2, Plus, Loader2 } from "lucide-react"
import type { AccountType } from "@/components/accounts/types"
import axios from "axios"
import { useSession } from "next-auth/react"
import { ClearableSelect } from "@/components/ui/clearable-select"

type ExpenseItem = {
  headId: string
  headName: string
  amount: number
}

type FormValues = {
  // Temporary fields for adding items
  tempHeadId: string
  tempAmount: string
  
  // Main fields
  items: ExpenseItem[]
  paymentMethod: string
  accountId: string
  accountName?: string
  availableBalance?: string
  totalAmount: number
  date: string
  note?: string
  voucherImage1?: string
  voucherImage2?: string
}

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  mode: "add" | "edit"
  initialValues?: Partial<FormValues>
  onSubmit: (values: any) => Promise<boolean>
}

export default function ExpenseModal({ open, onOpenChange, mode, initialValues, onSubmit }: Props) {
  const { data: session } = useSession()
  const { register, setValue, handleSubmit, reset, watch, setError, clearErrors, control, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      tempHeadId: "",
      tempAmount: "",
      items: [],
      paymentMethod: "",
      accountId: "",
      totalAmount: 0,
      date: new Date().toISOString().slice(0, 10),
      note: "",
      ...initialValues,
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  })

  const [heads, setHeads] = useState<Array<{ id: string; name: string }>>([])
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string; type: AccountType; lastBalance?: number }>>([])
  const [paymentMethodOptions, setPaymentMethodOptions] = useState<AccountType[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [loadingHeads, setLoadingHeads] = useState(false)
  const [loadingAccounts, setLoadingAccounts] = useState(false)

  const client = axios.create({
    baseURL: "",
    headers: { "x-company-id": session?.user?.companyId ?? "" },
  })

  // Fetch Heads
  useEffect(() => {
    if (!open) return
    const fetchHeads = async () => {
      setLoadingHeads(true)
      try {
        const res = await client.get("/api/expense-heads?page=1&pageSize=100")
        const items = res.data?.items || res.data?.data?.items || []
        setHeads(items.map((i: any) => ({ id: i.id, name: i.name })))
      } catch { } finally { setLoadingHeads(false) }
    }
    fetchHeads()
  }, [open, session])

  // Fetch Accounts
  useEffect(() => {
    if (!open) return
    const fetchAccounts = async () => {
      setLoadingAccounts(true)
      try {
        const res = await client.get("/api/accounts?page=1&pageSize=100")
        const items = res.data?.items || []
        const mapped = items.map((i: any) => ({
          id: String(i.id || i._id),
          name: i.bankName ? `${i.name} (${i.bankName})` : String(i.name || ""),
          type: String(i.type || "Cash") as AccountType,
          lastBalance: typeof i.lastBalance === "number" ? i.lastBalance : Number(i.lastBalance || 0),
        }))
        setAccounts(mapped)
      } catch { } finally { setLoadingAccounts(false) }
    }
    fetchAccounts()
  }, [open, session])

  // Fetch Account Types
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

  // Reset account if not in filtered list
  useEffect(() => {
    if (loadingAccounts) return

    if (!paymentMethod) setValue("accountId", "")
    else {
      const acc = watch("accountId")
      const ids = filteredAccounts.map(a => a.id)
      if (acc && !ids.includes(acc)) setValue("accountId", "")
    }
  }, [paymentMethod, accounts, loadingAccounts])

  // Set available balance
  useEffect(() => {
    const accId = watch("accountId")
    const acc = filteredAccounts.find(a => a.id === accId)
    if (acc && typeof acc.lastBalance === "number") {
      setValue("availableBalance", String(acc.lastBalance))
    } else {
      setValue("availableBalance", "")
    }
  }, [watch("accountId"), filteredAccounts])

  // Calculate Total
  const items = watch("items")
  const tempAmount = watch("tempAmount")
  useEffect(() => {
    const itemsTotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
    const currentTemp = Number(tempAmount) || 0
    setValue("totalAmount", itemsTotal + currentTemp)
  }, [items, tempAmount, setValue])

  useEffect(() => {
    if (initialValues) {
      reset({
        ...watch(),
        ...initialValues,
        items: initialValues.items || []
      })
    } else {
      reset({
        tempHeadId: "",
        tempAmount: "",
        items: [],
        paymentMethod: "",
        accountId: "",
        totalAmount: 0,
        date: new Date().toISOString().slice(0, 10),
        note: "",
      })
    }
  }, [initialValues, open])

  const handleAddItem = () => {
    const headId = watch("tempHeadId")
    const amount = Number(watch("tempAmount"))
    
    if (!headId) {
      setError("tempHeadId", { type: "required", message: "Head is required" })
      return
    }
    if (!amount || amount <= 0) {
      setError("tempAmount", { type: "required", message: "Amount must be greater than 0" })
      return
    }

    const head = heads.find(h => h.id === headId)
    append({
      headId,
      headName: head?.name || "",
      amount
    })

    setValue("tempHeadId", "")
    setValue("tempAmount", "")
    clearErrors("items")
  }

  const onSubmitInternal = async (vals: FormValues) => {
    // Check if there are values in the temp fields and add them to items
    let finalItems = [...vals.items]
    const tempHeadId = vals.tempHeadId
    const tempAmount = Number(vals.tempAmount)

    if (tempHeadId || (tempAmount && tempAmount > 0)) {
       if (!tempHeadId) {
         setError("tempHeadId", { type: "required", message: "Head is required" })
         return
       }
       if (!tempAmount || tempAmount <= 0) {
         setError("tempAmount", { type: "required", message: "Amount must be greater than 0" })
         return
       }

       const head = heads.find(h => h.id === tempHeadId)
       finalItems.push({
         headId: tempHeadId,
         headName: head?.name || "",
         amount: tempAmount
       })
    }

    if (finalItems.length === 0) {
      setError("items", { type: "required", message: "At least one expense item is required" })
      return
    }

    if (!vals.accountId) {
      setError("accountId", { type: "required", message: "Account is required" })
      return
    }

    const acc = filteredAccounts.find(a => a.id === vals.accountId)
    const finalTotal = finalItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
    
    try {
      setSubmitting(true)
      const ok = await onSubmit({
        ...vals,
        items: finalItems,
        totalAmount: finalTotal,
        accountName: acc?.name || ""
      })
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
      <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto bg-gray-50">
        <DialogHeader>
          <div className="flex justify-between items-center">
             <DialogTitle className="text-xl font-semibold">
               {mode === "add" ? "Add Expense" : "Edit Expense"}
             </DialogTitle>
             {/* {mode === "add" && (
                <Button variant="ghost" className="bg-sky-500 hover:bg-sky-600 text-white h-8 px-3" onClick={() => onOpenChange(false)}>
                   Return to Expense List
                </Button>
             )} */}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmitInternal)}>
          <div className="p-1 space-y-6">
            
            {/* Add Items Section */}
            <div className="bg-white p-4 rounded-md shadow-sm border border-gray-100 flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[200px] space-y-2">
                 <Label>{requiredMark("Head:", true)}</Label>
                 <ClearableSelect
                   value={watch("tempHeadId")}
                   onChange={(v) => {
                     setValue("tempHeadId", v)
                     clearErrors(["tempHeadId", "items"])
                   }}
                   options={heads.map(h => ({ label: h.name, value: h.id }))}
                   placeholder="Select Head"
                   error={!!errors.tempHeadId}
                 />
                 {errors.tempHeadId && <div className="text-red-500 text-xs">{errors.tempHeadId.message}</div>}
              </div>

              <div className="flex-1 min-w-[150px] space-y-2">
                 <Label>{requiredMark("Amount:", true)}</Label>
                 <Input 
                   type="number" 
                   placeholder="Amount" 
                   value={watch("tempAmount")}
                   onChange={(e) => {
                     setValue("tempAmount", e.target.value)
                     clearErrors(["tempAmount", "items"])
                   }}
                 />
                 {errors.tempAmount && <div className="text-red-500 text-xs">{errors.tempAmount.message}</div>}
              </div>

              <div className="pb-0.5">
                 <Button type="button" onClick={handleAddItem} className="bg-sky-500 hover:bg-sky-600">
                   <Plus className="w-4 h-4 mr-2" /> Add More
                 </Button>
              </div>
            </div>

            {/* Items List */}
            {fields.length > 0 && (
              <div className="bg-white p-4 rounded-md shadow-sm border border-gray-100">
                 <Label className="mb-2 block font-semibold">Expense Items:</Label>
                 <div className="space-y-2">
                   {fields.map((field, index) => (
                     <div key={field.id} className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-200">
                       <span className="font-medium">{field.headName}</span>
                       <div className="flex items-center gap-4">
                         <span className="font-mono">{Number(field.amount).toFixed(2)}</span>
                         <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                           <Trash2 className="w-4 h-4" />
                         </Button>
                       </div>
                     </div>
                   ))}
                   <div className="flex justify-between items-center pt-2 border-t mt-2 font-bold">
                      <span>Total</span>
                      <span className="mr-12">{Number(watch("totalAmount") || 0).toFixed(2)}</span>
                   </div>
                 </div>
                 {errors.items && <div className="text-red-500 text-xs mt-2">{errors.items.message}</div>}
              </div>
            )}

            {/* Main Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{requiredMark("Payment Method:", true)}</Label>
                    <ClearableSelect
                      value={watch("paymentMethod")}
                      onChange={(v) => setValue("paymentMethod", v)}
                      options={paymentMethodOptions.map(m => ({ label: m, value: m }))}
                      placeholder="Select Payment Method"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{requiredMark("Available Balance:", true)}</Label>
                    <Input placeholder="Select your account" readOnly {...register("availableBalance")} />
                  </div>

                  <div className="space-y-2">
                    <Label>{requiredMark("Date:", true)}</Label>
                    <DateInput 
                      value={watch("date") ? new Date(watch("date")) : undefined}
                      onChange={(d) => setValue("date", d ? d.toISOString().slice(0, 10) : "")}
                    />
                  </div>
                  
                  <div className="space-y-2">
                     <Button type="button" variant="outline" className="w-full justify-start text-gray-500">
                        <Upload className="w-4 h-4 mr-2" /> Voucher image 1
                     </Button>
                  </div>

                  <div className="space-y-2">
                     <Button type="button" variant="outline" className="w-full justify-start text-gray-500">
                        <Upload className="w-4 h-4 mr-2" /> Voucher image 2
                     </Button>
                  </div>
               </div>

               <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{requiredMark("Account:", true)}</Label>
                    <ClearableSelect
                      value={watch("accountId")}
                      onChange={(v) => setValue("accountId", v)}
                      options={filteredAccounts.map(a => ({ label: a.name, value: a.id }))}
                      placeholder="Select Account"
                      disabled={!paymentMethod}
                      error={!!errors.accountId}
                    />
                    {errors.accountId && <div className="text-red-500 text-xs">{errors.accountId.message}</div>}
                  </div>

                  <div className="space-y-2">
                    <Label>{requiredMark("Total Amount:", true)}</Label>
                    <Input type="number" placeholder="0" readOnly {...register("totalAmount")} />
                  </div>

                  <div className="space-y-2">
                    <Label>Note:</Label>
                    <Textarea rows={4} placeholder="Note something" {...register("note")} />
                  </div>
               </div>
            </div>

            <div className="flex justify-end pt-4">
               <Button type="submit" className="bg-sky-500 hover:bg-sky-600 min-w-[150px]" disabled={submitting}>
                 {submitting ? (
                   <>
                     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                     {mode === "add" ? "Creating..." : "Updating..."}
                   </>
                 ) : (
                   mode === "add" ? "Create Expense" : "Update Expense"
                 )}
               </Button>
            </div>

          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
