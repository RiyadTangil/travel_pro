"use client"

import { useState, useEffect, useMemo } from "react"
import { useForm, FormProvider } from "react-hook-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import VendorSelect from "@/components/vendors/vendor-select"
import { Upload } from "lucide-react"
import { DateInput } from "@/components/ui/date-input"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import SpecificInvoicePayment from "./specific-invoice-payment"

interface AccountOptionItem {
  id: string
  name: string
  type: string
  lastBalance?: number
}

interface PaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: any) => void
  accountsPreloaded?: AccountOptionItem[]
  initialData?: any
  loading?: boolean
}

export default function PaymentModal({ open, onOpenChange, onSubmit, accountsPreloaded, initialData, loading = false }: PaymentModalProps) {
  const { data: session } = useSession()
  const methods = useForm({
    defaultValues: {
      paymentTo: "overall",
      invoiceId: "",
      invoiceVendors: [] as any[],
      vendorId: "",
      presentBalance: 0,
      paymentMethod: "",
      accountId: "",
      availableBalance: 0,
      amount: 0,
      vendorAit: 0,
      totalAmount: 0,
      receiptNo: "",
      referPassport: "no",
      passportNo: "",
      date: new Date(),
      note: "",
      voucher: null as File | null
    }
  })

  const { register, handleSubmit, setValue, watch, reset } = methods
  const isEdit = !!initialData

  useEffect(() => {
    if (open) {
      if (initialData) {
        // Reset form with initial data for edit
        reset({
          paymentTo: initialData.paymentTo || "overall",
          invoiceId: initialData.invoiceId || "",
          invoiceVendors: initialData.invoiceVendors || [],
          vendorId: initialData.vendorId || "",
          presentBalance: 0, // Will be fetched
          paymentMethod: initialData.paymentMethod || "",
          accountId: initialData.accountId || "",
          availableBalance: 0, // Will be fetched
          amount: initialData.amount || 0,
          vendorAit: initialData.vendorAit || 0,
          totalAmount: initialData.totalAmount || 0,
          receiptNo: initialData.receiptNo || "",
          referPassport: initialData.referPassport || "no",
          passportNo: initialData.passportNo || "",
          date: initialData.date ? new Date(initialData.date) : new Date(),
          note: initialData.note || "",
          voucher: null
        })
      } else {
        // Reset to default for create
        reset({
          paymentTo: "overall",
          invoiceId: "",
          invoiceVendors: [],
          vendorId: "",
          presentBalance: 0,
          paymentMethod: "",
          accountId: "",
          availableBalance: 0,
          amount: 0,
          vendorAit: 0,
          totalAmount: 0,
          receiptNo: "",
          referPassport: "no",
          passportNo: "",
          date: new Date(),
          note: "",
          voucher: null
        })
      }
    }
  }, [open, initialData, reset])


  const [accounts, setAccounts] = useState<AccountOptionItem[]>(accountsPreloaded || [])
  const [paymentMethodOptions, setPaymentMethodOptions] = useState<string[]>([])
  const [vendorBalanceStatus, setVendorBalanceStatus] = useState<"due" | "advance" | null>(null)
  
  const paymentTo = watch("paymentTo")
  const referPassport = watch("referPassport")
  const amount = watch("amount")
  const vendorAit = watch("vendorAit")
  const vendorId = watch("vendorId")
  const paymentMethod = watch("paymentMethod")
  const accountId = watch("accountId")
  const dateValue = watch("date")

  // Fetch Account Types (Payment Methods)
  useEffect(() => {
    if (!open) return
    const ctrl = new AbortController()
    ;(async () => {
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

  // Fetch Accounts with Balances (if preloaded doesn't have balances or to be fresh)
  useEffect(() => {
    if (!open) return
    const ctrl = new AbortController()
    ;(async () => {
      try {
        // We fetch accounts to ensure we have the latest balance (lastBalance)
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
        // Fallback to preloaded if fetch fails
        if (accountsPreloaded) setAccounts(accountsPreloaded)
      }
    })()
    return () => ctrl.abort()
  }, [open, session, accountsPreloaded])

  // Fetch Vendor Balance
  useEffect(() => {
    if (!vendorId) {
      setValue("presentBalance", 0)
      setVendorBalanceStatus(null)
      return
    }
    const ctrl = new AbortController()
    ;(async () => {
      try {
        const res = await fetch(`/api/vendors/${vendorId}`, { signal: ctrl.signal })
        if (!res.ok) return
        const data = await res.json()
        const v = data.vendor
        
        // Handle object-based presentBalance (e.g. { type: "due", amount: 50 })
        // or number-based (legacy)
        let bal = 0
        let status: "due" | "advance" | null = null

        if (v?.presentBalance && typeof v.presentBalance === 'object') {
          bal = Number(v.presentBalance.amount || 0)
          status = v.presentBalance.type === "due" ? "due" : "advance"
        } else {
          bal = Number(v?.presentBalance || v?.balance || 0)
          // Simple logic if no type provided: positive is advance, negative is due? 
          // Or just assume 0. Let's stick to the object if available.
          if (bal < 0) status = "due"
          else if (bal > 0) status = "advance"
        }

        setValue("presentBalance", bal)
        setVendorBalanceStatus(status)
      } catch (e) {
        // ignore
      }
    })()
    return () => ctrl.abort()
  }, [vendorId, setValue])

  // Filter Accounts based on Payment Method
  const filteredAccounts = useMemo(() => {
    if (!paymentMethod) return []
    return accounts.filter(a => a.type === paymentMethod)
  }, [accounts, paymentMethod])

  // Update Available Balance when Account changes
  useEffect(() => {
    if (!accountId) {
      setValue("availableBalance", 0)
      return
    }
    const acc = accounts.find(a => a.id === accountId)
    if (acc) {
      setValue("availableBalance", acc.lastBalance || 0)
    }
  }, [accountId, accounts, setValue])

  // Auto-calculate total amount
  useEffect(() => {
    const total = (Number(amount) || 0) + (Number(vendorAit) || 0)
    setValue("totalAmount", total)
  }, [amount, vendorAit, setValue])

  const [submitting, setSubmitting] = useState(false)

  const onFormSubmit = async (data: any) => {
    try {
      setSubmitting(true)
      await onSubmit(data)
      // reset() // Let parent handle reset/close if needed or do it here
      onOpenChange(false)
    } catch (error) {
      console.error(error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Payment</DialogTitle>
        </DialogHeader>

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Payment To & Invoice Selection Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Payment To */}
              <div className="space-y-2">
                <Label>Payment To</Label>
                <Select 
                  onValueChange={(val) => setValue("paymentTo", val)} 
                  defaultValue={paymentTo}
                  disabled={isEdit}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Payment Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="overall">Overall</SelectItem>
                    <SelectItem value="invoice">Specific Invoice</SelectItem>
                    <SelectItem value="advance">Advance Payment</SelectItem>
                    <SelectItem value="adjust">Adjust With Due</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Invoice Selection (Only visible when paymentTo is 'invoice') */}
              {paymentTo === "invoice" && (
                <SpecificInvoicePayment mode="select-only" disabled={isEdit} />
              )}
            </div>

            {/* Vendor Rows (Only visible when paymentTo is 'invoice') */}
            {paymentTo === "invoice" ? (
              <div className="md:col-span-2">
                <SpecificInvoicePayment mode="table-only" />
              </div>
            ) : (
              <>
                {/* Select Vendor */}
                <div className="space-y-2">
                  <Label>Select Vendor</Label>
                  <VendorSelect 
                    value={watch("vendorId")}
                    onChange={(id) => setValue("vendorId", id || "")}
                    placeholder="Select Vendor"
                  />
                </div>

                {/* Present Balance */}
                <div className="space-y-2">
                  <Label>
                    Present Balance
                    {vendorBalanceStatus && (
                      <span className={cn(
                        "ml-2 text-xs font-medium px-2 py-0.5 rounded",
                        vendorBalanceStatus === "due" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                      )}>
                        {vendorBalanceStatus === "due" ? "Due" : "Advance"}
                      </span>
                    )}
                  </Label>
                  <Input 
                    type="number" 
                    readOnly 
                    {...register("presentBalance")} 
                    className={cn(
                      "bg-muted",
                      vendorBalanceStatus === "due" && "border-red-500 focus-visible:ring-red-500"
                    )}
                  />
                </div>
              </>
            )}

            {/* Payment Method */}
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select 
                onValueChange={(val) => {
                  setValue("paymentMethod", val)
                  setValue("accountId", "") // Reset account when method changes
                }}
                disabled={isEdit}
                value={paymentMethod} // Controlled value ensures display updates even if disabled
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Method" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethodOptions.map((method) => (
                    <SelectItem key={method} value={method}>{method}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Account */}
            <div className="space-y-2">
              <Label>Account</Label>
              <Select 
                onValueChange={(val) => setValue("accountId", val)}
                value={accountId}
                disabled={!paymentMethod}
              >
                <SelectTrigger>
                  <SelectValue placeholder={paymentMethod ? "Select Account" : "Select Method First"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Available Balance */}
            <div className="space-y-2">
              <Label>Available Balance</Label>
              <Input 
                type="number" 
                readOnly 
                {...register("availableBalance")} 
                className="bg-muted"
              />
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input 
                type="number" 
                placeholder="0.00"
                {...register("amount")} 
                readOnly={paymentTo === "invoice"} // Amount is auto-calculated for invoice
                className={paymentTo === "invoice" ? "bg-muted" : ""}
              />
            </div>

            {/* Vendor AIT */}
            <div className="space-y-2">
              <Label>Vendor AIT</Label>
              <Input 
                type="number" 
                placeholder="0.00"
                {...register("vendorAit")} 
              />
            </div>

            {/* Total Amount */}
            <div className="space-y-2">
              <Label>Total Amount</Label>
              <Input 
                type="number" 
                readOnly 
                {...register("totalAmount")} 
                className="bg-muted"
              />
            </div>

            {/* Receipt/Trans No */}
            <div className="space-y-2">
              <Label>Receipt/Trans No</Label>
              <Input 
                placeholder="Enter Receipt/Transaction No"
                {...register("receiptNo")} 
              />
            </div>

            {/* Refer Passport No */}
            <div className="space-y-2">
              <Label>Refer Passport no</Label>
              <Select 
                onValueChange={(val) => setValue("referPassport", val)} 
                defaultValue="no"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Conditional Passport Field */}
            {referPassport === "yes" && (
              <div className="space-y-2">
                <Label>Passport No</Label>
                <Input 
                  placeholder="Enter Passport Number"
                  {...register("passportNo")} 
                />
              </div>
            )}

            {/* Date */}
            <div className="space-y-2 flex flex-col">
              <Label>Date</Label>
              <DateInput 
                value={dateValue}
                onChange={(date) => setValue("date", date || new Date())}
              />
            </div>

            {/* Voucher Upload */}
            <div className="space-y-2">
              <Label>Voucher Upload</Label>
              <div className="flex items-center gap-2">
                <Input 
                  type="file" 
                  className="cursor-pointer"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null
                    setValue("voucher", file)
                  }}
                />
              </div>
            </div>

            {/* Note - Full Width */}
            <div className="md:col-span-2 space-y-2">
              <Label>Note</Label>
              <Textarea 
                placeholder="Enter any notes..."
                {...register("note")} 
              />
            </div>

          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
              {loading ? "Saving..." : "Submit Payment"}
            </Button>
          </div>
        </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  )
}
