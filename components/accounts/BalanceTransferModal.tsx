"use client"

import { useEffect, useState, useMemo } from "react"
import { useForm, Controller } from "react-hook-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { DateInput } from "@/components/ui/date-input"
import { Loader2 } from "lucide-react"
import axios from "axios"
import { useSession } from "next-auth/react"

type AccountOption = {
  id: string
  name: string
  lastBalance: number
}

type FormValues = {
  transferFromId: string
  transferToId: string
  amount: string
  transferCharge: string
  date: string
  note?: string
}

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  mode: "add" | "edit"
  initialValues?: Partial<FormValues> & { 
    transferFromName?: string
    transferToName?: string
  }
  onSubmit: (values: FormValues) => Promise<boolean>
}

export default function BalanceTransferModal({ open, onOpenChange, mode, initialValues, onSubmit }: Props) {
  const { data: session } = useSession()
  const { register, setValue, handleSubmit, control, watch, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      transferFromId: "",
      transferToId: "",
      amount: "",
      transferCharge: "",
      date: new Date().toISOString().slice(0, 10),
      note: "",
    },
  })

  const [accounts, setAccounts] = useState<AccountOption[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const transferFromId = watch("transferFromId")
  const amount = watch("amount")
  const transferCharge = watch("transferCharge")

  const selectedFromAccount = useMemo(() => 
    accounts.find(a => a.id === transferFromId), 
  [accounts, transferFromId])

  const totalAmount = useMemo(() => {
    const amt = Number(amount) || 0
    const chg = Number(transferCharge) || 0
    return amt + chg
  }, [amount, transferCharge])

  const client = useMemo(() => axios.create({
    baseURL: "",
    headers: { "x-company-id": session?.user?.companyId ?? "" },
  }), [session])

  useEffect(() => {
    if (open) {
      if (mode === "edit" && initialValues) {
        reset({
          transferFromId: initialValues.transferFromId || "",
          transferToId: initialValues.transferToId || "",
          amount: initialValues.amount || "",
          transferCharge: initialValues.transferCharge || "",
          date: initialValues.date || new Date().toISOString().slice(0, 10),
          note: initialValues.note || "",
        })
      } else {
        reset({
          transferFromId: "",
          transferToId: "",
          amount: "",
          transferCharge: "",
          date: new Date().toISOString().slice(0, 10),
          note: "",
        })
      }
    }
  }, [open, mode, initialValues, reset])

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
          lastBalance: Number(i.lastBalance || 0),
        })))
      } catch (e) {
        console.error(e)
      } finally {
        setLoadingAccounts(false)
      }
    }
    fetchAccounts()
  }, [open, client])

  const onFormSubmit = async (values: FormValues) => {
    setSubmitting(true)
    const success = await onSubmit(values)
    setSubmitting(false)
    if (success) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add Balance Transfer" : "Edit Balance Transfer"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Transfer From <span className="text-red-500">*</span></Label>
              <Controller
                control={control}
                name="transferFromId"
                rules={{ required: "Required" }}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Transfer From Account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.transferFromId && <span className="text-sm text-red-500">{errors.transferFromId.message}</span>}
            </div>
            
            <div className="space-y-2">
              <Label>Balance <span className="text-red-500">*</span></Label>
              <Input 
                readOnly 
                value={selectedFromAccount ? selectedFromAccount.lastBalance : "Account Last Balance"} 
                className="bg-gray-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Transfer To <span className="text-red-500">*</span></Label>
              <Controller
                control={control}
                name="transferToId"
                rules={{ required: "Required" }}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Transfer To Account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.filter(a => a.id !== transferFromId).map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.transferToId && <span className="text-sm text-red-500">{errors.transferToId.message}</span>}
            </div>

            <div className="space-y-2">
              <Label>Amount: <span className="text-red-500">*</span></Label>
              <Input 
                type="number" 
                placeholder="Please Enter your Amount"
                {...register("amount", { required: "Required", min: 0.01 })} 
              />
              {errors.amount && <span className="text-sm text-red-500">{errors.amount.message}</span>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Transfer Charge:</Label>
              <Input 
                type="number" 
                placeholder="Enter your transfer charge"
                {...register("transferCharge")} 
              />
            </div>

            <div className="space-y-2">
              <Label>Total Amount:</Label>
              <Input 
                readOnly 
                value={totalAmount || ""} 
                className="bg-gray-100"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Date: <span className="text-red-500">*</span></Label>
            <DateInput 
              value={watch("date")} 
              onChange={(d) => setValue("date", d)} 
            />
            {errors.date && <span className="text-sm text-red-500">{errors.date.message}</span>}
          </div>

          <div className="space-y-2">
            <Label>Note:</Label>
            <Textarea 
              placeholder="Enter your message" 
              {...register("note")} 
            />
          </div>

          <div className="flex justify-start">
            <Button type="submit" className="bg-sky-500 hover:bg-sky-600 text-white" disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {mode === "add" ? "Add Balance Transfer" : "Update Balance Transfer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
