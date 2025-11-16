"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { DateInput } from "@/components/ui/date-input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { PRODUCT_OPTIONS, Vendor } from "./types"
import { Loader2 } from "lucide-react"

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  initialData?: Vendor
  onSubmit?: (v: Vendor) => Promise<void> | void
  productOptions?: string[]
}

export function VendorAddModal({ open, onOpenChange, initialData, onSubmit, productOptions = PRODUCT_OPTIONS }: Props) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [mobilePrefix, setMobilePrefix] = useState("BD +88")
  const [mobile, setMobile] = useState("")
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [openingBalanceType, setOpeningBalanceType] = useState<"due" | "advance"  | undefined>(undefined)
  const [openingBalance, setOpeningBalance] = useState<number | undefined>(undefined)
  const [fixedAdvance, setFixedAdvance] = useState<number | undefined>(undefined)
  const [address, setAddress] = useState("")
  const [creditLimit, setCreditLimit] = useState<number | undefined>(undefined)
  const [active, setActive] = useState(true)
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [checkAll, setCheckAll] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "")
      setEmail(initialData.email || "")
      setMobilePrefix(initialData.mobilePrefix || "BD +88")
      setMobile(initialData.mobile || "")
      setDate(initialData.registrationDate)
      setOpeningBalanceType(initialData.openingBalanceType)
      setOpeningBalance(initialData.openingBalance)
      setFixedAdvance(initialData.fixedAdvance)
      setAddress(initialData.address || "")
      setCreditLimit(initialData.creditLimit)
      setActive(initialData.active)
      setSelectedProducts(initialData.products || [])
      setCheckAll((initialData.products || []).length === productOptions.length)
    }
  }, [initialData, productOptions])

  useEffect(() => {
    if (checkAll) {
      setSelectedProducts(productOptions)
    } else if (selectedProducts.length === productOptions.length) {
      setSelectedProducts([])
    }
  }, [checkAll, productOptions, selectedProducts.length])

  const toggleProduct = (p: string) => {
    setSelectedProducts((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]))
  }

  const isValid = useMemo(() => {
    return name.trim().length > 0 && !!date
  }, [name, date])

  const handleSave = async () => {
    if (!isValid || submitting) return
    const v: Vendor = {
      id: initialData?.id ?? Math.random().toString(36).slice(2),
      name,
      email,
      mobilePrefix,
      mobile,
      registrationDate: date,
      openingBalanceType,
      openingBalance: openingBalance ?? 0,
      fixedAdvance: fixedAdvance ?? 0,
      address,
      creditLimit: creditLimit ?? 0,
      active,
      products: selectedProducts,
      presentBalance: initialData?.presentBalance ?? { type: "due", amount: 0 },
      fixedBalance: initialData?.fixedBalance ?? 0,
    }
    try {
      setSubmitting(true)
      await onSubmit?.(v)
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Vendor" : "Add Vendor"}</DialogTitle>
        </DialogHeader>
        {/* Top form fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <Label>
              Name <span className="text-red-600">*</span>
            </Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          </div>
          <div>
            <Label>Mobile No:</Label>
            <div className="flex gap-2">
              <Select value={mobilePrefix} onValueChange={setMobilePrefix}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BD +88">BD +88</SelectItem>
                </SelectContent>
              </Select>
              <Input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="Mobile number" />
            </div>
          </div>

          <div>
            <Label>
              Date <span className="text-red-600">*</span>
            </Label>
            <DateInput value={date} onChange={setDate} placeholder="dd-MM-yyyy" />
          </div>
          <div>
            <Label>Opening Balance Type:</Label>
            <Select value={openingBalanceType} onValueChange={(v) => setOpeningBalanceType(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Select Opening Balance Type:" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="due">Due</SelectItem>
                <SelectItem value="advance">Advance</SelectItem>
           
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Opening Balance :</Label>
            <Input type="number" value={openingBalance ?? ""} onChange={(e) => setOpeningBalance(Number(e.target.value))} placeholder="Opening Balance :" />
          </div>

          <div>
            <Label>Fixed advance:</Label>
            <Input type="number" value={fixedAdvance ?? ""} onChange={(e) => setFixedAdvance(Number(e.target.value))} placeholder="Fixed advance:" />
          </div>
          <div>
            <Label>Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address" />
          </div>
          <div>
            <Label>Credit Limit :</Label>
            <Input type="number" value={creditLimit ?? ""} onChange={(e) => setCreditLimit(Number(e.target.value))} placeholder="Credit Limit" />
          </div>
        </div>

        {/* Products checklist */}
        <div className="mt-4">
          <Label>
            Products <span className="text-red-600">*</span>
          </Label>
          <div className="flex items-center gap-2 mt-2">
            <Checkbox id="check_all" checked={checkAll} onCheckedChange={(v) => setCheckAll(!!v)} />
            <label htmlFor="check_all" className="text-sm">Check all</label>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-2">
            {productOptions.map((p) => (
              <label key={p} className="flex items-center gap-2">
                <Checkbox checked={selectedProducts.includes(p)} onCheckedChange={() => toggleProduct(p)} />
                <span>{p}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => !submitting && onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button disabled={!isValid || submitting} className="bg-blue-600 hover:bg-blue-700" onClick={handleSave}>
            {submitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </span>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}