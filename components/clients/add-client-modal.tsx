"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { EmailInput } from "@/components/ui/email-input"
import { cn } from "@/lib/utils"

type CategoryOption = { id: string; name: string; prefix: string }

interface AddClientModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSubmit: (payload: Record<string, any>) => Promise<void> | void
  loading?: boolean
  initialValues?: Partial<{
    categoryId: string
    clientType: string
    name: string
    email: string
    gender: string
    phone: string
    address: string
    walkingCustomer: string
    source: string
    designation: string
    tradeLicenseNo: string
    openingBalanceType: string
    openingBalanceAmount: string
    creditLimit: string
  }>
  mode?: "add" | "edit"
}

export default function AddClientModal({ open, onOpenChange, onSubmit, loading, initialValues, mode = "add" }: AddClientModalProps) {
  const [categories, setCategories] = useState<CategoryOption[]>([])

  const { register, handleSubmit, setValue, reset, watch, formState: { errors } } = useForm({
    defaultValues: {
      categoryId: "",
      clientType: "Individual",
      name: "",
      email: "",
      gender: "",
      phone: "",
      address: "",
      walkingCustomer: "No",
      source: "",
      designation: "",
      tradeLicenseNo: "",
      openingBalanceType: "",
      openingBalanceAmount: "",
      creditLimit: "",
    }
  })

  useEffect(() => {
    if (!open) return
    fetch(`/api/clients/client-categories?page=1&pageSize=100`)
      .then((r) => r.json())
      .then((data) => setCategories(data.data || []))
      .catch(() => setCategories([]))
  }, [open])

  useEffect(() => {
    if (!open) return
    if (initialValues) {
      reset({
        categoryId: initialValues.categoryId || "",
        clientType: initialValues.clientType || "Individual",
        name: initialValues.name || "",
        email: initialValues.email || "",
        gender: initialValues.gender || "",
        phone: initialValues.phone || "",
        address: initialValues.address || "",
        walkingCustomer: initialValues.walkingCustomer || "No",
        source: initialValues.source || "",
        designation: initialValues.designation || "",
        tradeLicenseNo: initialValues.tradeLicenseNo || "",
        openingBalanceType: initialValues.openingBalanceType || "",
        openingBalanceAmount: (initialValues as any).openingBalanceAmount || "",
        creditLimit: initialValues.creditLimit || "",
      })
    } else {
      reset({
        categoryId: "",
        clientType: "Individual",
        name: "",
        email: "",
        gender: "",
        phone: "",
        address: "",
        walkingCustomer: "No",
        source: "",
        designation: "",
        tradeLicenseNo: "",
        openingBalanceType: "",
        openingBalanceAmount: "",
        creditLimit: "",
      })
    }
  }, [open, initialValues, reset])

  const onSubmitForm = async (data: any) => {
    const amountNum = typeof data.openingBalanceAmount === "string"
      ? parseFloat(data.openingBalanceAmount || "0") || 0
      : (Number(data.openingBalanceAmount) || 0)
    const type = data.openingBalanceType
    const presentBalance = type === "Due" ? -Math.abs(amountNum) : type === "Advance" ? Math.abs(amountNum) : 0
    const creditLimitNum = typeof data.creditLimit === "string" ? parseFloat(data.creditLimit || "0") || 0 : Number(data.creditLimit) || 0
    const payload = {
      ...data,
      creditLimit: creditLimitNum,
      ...(mode === "add" ? { presentBalance } : {}),
    }
    // Prevent editing opening balance fields in edit mode
    if (mode === "edit") {
      delete (payload as any).openingBalanceType
      delete (payload as any).openingBalanceAmount
      delete (payload as any).presentBalance
    }
    await onSubmit(payload)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit Client Information" : "Add Client Information"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className={cn(errors.categoryId && "text-red-500")}>Client Category *</Label>
              <Select value={watch("categoryId")} onValueChange={(v) => setValue("categoryId", v, { shouldValidate: true })}>
                <SelectTrigger className={cn(errors.categoryId && "border-red-500 focus:ring-red-500")}>
                  <SelectValue placeholder="Select a Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.categoryId && <p className="text-red-600 text-[10px] font-medium uppercase tracking-tight">Category is required</p>}
              <input type="hidden" {...register("categoryId", { required: true })} />
            </div>

            <div className="space-y-2">
              <Label className={cn(errors.clientType && "text-red-500")}>Client Type *</Label>
              <Select value={watch("clientType")} onValueChange={(v) => setValue("clientType", v, { shouldValidate: true })}>
                <SelectTrigger className={cn(errors.clientType && "border-red-500 focus:ring-red-500")}>
                  <SelectValue placeholder="Select client type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Individual">Individual</SelectItem>
                  <SelectItem value="Corporate">Corporate</SelectItem>
                </SelectContent>
              </Select>
              {errors.clientType && <p className="text-red-600 text-[10px] font-medium uppercase tracking-tight">Type is required</p>}
              <input type="hidden" {...register("clientType", { required: true })} />
            </div>

            <div className="space-y-2">
              <Label className={cn(errors.name && "text-red-500")}>Name *</Label>
              <Input 
                {...register("name", { required: "Name is required" })} 
                placeholder="Name" 
                className={cn(errors.name && "border-red-500 focus-visible:ring-red-500")}
              />
              {errors.name && <p className="text-red-600 text-[10px] font-medium uppercase tracking-tight">{String(errors.name.message)}</p>}
            </div>

            <div className="space-y-2">
              <Label className={cn(errors.email && "text-red-500")}>Email</Label>
              <EmailInput 
                {...register("email", { 
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Invalid email address"
                  }
                })} 
                placeholder="Email" 
                error={errors.email?.message}
              />
            </div>

            <div className="space-y-2">
              <Label>Gender</Label>
              <Select value={watch("gender")} onValueChange={(v) => setValue("gender", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className={cn(errors.phone && "text-red-500")}>Mobile *</Label>
              <Input 
                {...register("phone", { required: "Mobile is required" })} 
                placeholder="Mobile Number" 
                className={cn(errors.phone && "border-red-500 focus-visible:ring-red-500")}
              />
              {errors.phone && <p className="text-red-600 text-[10px] font-medium uppercase tracking-tight">{String(errors.phone.message)}</p>}
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <Input {...register("address")} placeholder="Address" />
            </div>

            <div className="space-y-2">
              <Label>Walking Customer</Label>
              <Select value={watch("walkingCustomer")} onValueChange={(v) => setValue("walkingCustomer", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="No" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="No">No</SelectItem>
                  <SelectItem value="Yes">Yes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 col-span-1 lg:col-span-4">
              <Label>Client Source</Label>
              <Select value={watch("source")} onValueChange={(v) => setValue("source", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Existing Client">Existing Client</SelectItem>
                  <SelectItem value="Facebook Marketing">Facebook Marketing</SelectItem>
                  <SelectItem value="Search Engine">Search Engine</SelectItem>
                  <SelectItem value="YouTube Marketing">YouTube Marketing</SelectItem>
                  <SelectItem value="Direct Client">Direct Client</SelectItem>
                  <SelectItem value="Phone Call">Phone Call</SelectItem>
                  <SelectItem value="Linkedin">Linkedin</SelectItem>
                  <SelectItem value="Ads">Ads</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Designation</Label>
              <Input {...register("designation")} placeholder="Designation" />
            </div>
            <div className="space-y-2">
              <Label>Trade License No</Label>
              <Input {...register("tradeLicenseNo")} placeholder="Trade License No" />
            </div>
            {watch("openingBalanceType") && (
              <div className="space-y-2">
                <Label>Opening Balance Amount</Label>
                <Input {...register("openingBalanceAmount")} placeholder="0.00" type="number" step="0.01" disabled={mode === "edit"} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Opening Balance type</Label>
              <Select value={watch("openingBalanceType")} onValueChange={mode === "edit" ? undefined : (v) => setValue("openingBalanceType", v)}>
                <SelectTrigger disabled={mode === "edit"}>
                  <SelectValue placeholder="Select Opening Balance type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Due">Due</SelectItem>
                  <SelectItem value="Advance">Advance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Credit Limit</Label>
              <Input {...register("creditLimit")} placeholder="Credit Limit" type="number" step="0.01" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 min-w-[140px]" disabled={loading}>
              {loading ? (mode === "edit" ? "Updating..." : "Adding...") : (mode === "edit" ? "Save Changes" : "Add Client")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
