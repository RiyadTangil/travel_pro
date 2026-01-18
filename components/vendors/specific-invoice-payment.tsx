"use client"

import { useState, useEffect, useRef } from "react"
import { useFormContext, useFieldArray, Controller } from "react-hook-form"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Check, ChevronsUpDown, Plus, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

interface InvoiceItem {
  id: string
  invoiceNo: string
}

interface VendorSummary {
  vendor: {
    id: string
    name: string
    mobile?: string
    email?: string
  }
  totalCost: number
  paid: number
  due: number
}

interface SpecificInvoicePaymentProps {
  mode?: "select-only" | "table-only"
  disabled?: boolean
}

export default function SpecificInvoicePayment({ mode, disabled }: SpecificInvoicePaymentProps) {
  const { control, setValue, watch, getValues } = useFormContext()
  const { fields, append, remove } = useFieldArray({
    control,
    name: "invoiceVendors"
  })

  const [invoices, setInvoices] = useState<InvoiceItem[]>([])
  const [openInvoiceSelect, setOpenInvoiceSelect] = useState(false)
  const [vendorOptions, setVendorOptions] = useState<VendorSummary[]>([])

  const selectedInvoice = watch("invoiceId")
  const invoiceVendors = watch("invoiceVendors")
  const prevInvoiceIdRef = useRef(selectedInvoice)

  // Fetch unique invoices on mount
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/vendors/payment/invoices')
        const data = await res.json()
        setInvoices(data.items || [])
      } catch (e) {
        console.error("Failed to load invoices", e)
      }
    }
    load()
  }, [])

  // Fetch vendors when invoice selected
  useEffect(() => {
    if (!selectedInvoice) {
      setVendorOptions([])
      return
    }
    const loadVendors = async () => {
      try {
        const res = await fetch(`/api/vendors/payment/invoices/${selectedInvoice}/vendors`)
        const data = await res.json()
        setVendorOptions(data.items || [])
      } catch (e) {
        console.error("Failed to load vendors", e)
      }
    }
    loadVendors()
  }, [selectedInvoice])

  // Reset rows when invoice changes (only if switching to a new valid invoice)
  useEffect(() => {
    if (selectedInvoice && selectedInvoice !== prevInvoiceIdRef.current) {
      // Only reset if it's a real change by the user
      // If prevInvoiceIdRef.current was empty/undefined, it might be first load, 
      // but if we are in edit mode, we want to keep the data.
      // However, we don't know if it's edit mode here easily without props.
      // But if we trust that on mount 'selectedInvoice' is set correctly, 
      // we should only reset if it DIFFERS from the ref (which tracks the last seen value).
      
      // Wait, on first render, ref is initialized to selectedInvoice. 
      // So selectedInvoice === ref.current. This block won't run. Data preserved!
      
      setValue("invoiceVendors", [{ vendorId: "", amount: 0 }])
      prevInvoiceIdRef.current = selectedInvoice
    } else if (selectedInvoice && !prevInvoiceIdRef.current) {
        // First run where ref might be empty if initialized with empty?
        // If ref initialized with selectedInvoice, this won't hit.
        prevInvoiceIdRef.current = selectedInvoice
    }
  }, [selectedInvoice, setValue])

  const getVendorDetails = (vendorId: string) => {
    return vendorOptions.find(v => v.vendor.id === vendorId)
  }

  return (
    <div className={cn("space-y-6", mode === "table-only" && "border rounded-md p-4 bg-slate-50")}>
      {/* Select Invoice */}
      {(mode === undefined || mode === "select-only") && (
      <div className="space-y-2">
        <Label>Select Invoice <span className="text-red-500">*</span></Label>
        <Popover open={openInvoiceSelect} onOpenChange={setOpenInvoiceSelect}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={openInvoiceSelect}
              className="w-full justify-between"
              disabled={disabled}
            >
              {selectedInvoice
                ? invoices.find((i) => i.id === selectedInvoice)?.invoiceNo
                : "Select Invoice"}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0">
            <Command>
              <CommandInput placeholder="Search invoice..." />
              <CommandList>
                <CommandEmpty>No invoice found.</CommandEmpty>
                <CommandGroup>
                  {invoices.map((invoice) => (
                    <CommandItem
                      key={invoice.id}
                      value={invoice.invoiceNo}
                      onSelect={(currentValue) => {
                         // CommandItem uses value for filtering/selection. 
                         // We need to map back to ID if currentValue is not ID.
                         // invoices map sets value={invoice.invoiceNo}
                         const found = invoices.find(i => i.invoiceNo.toLowerCase() === currentValue.toLowerCase())
                         if (found) {
                             setValue("invoiceId", found.id)
                             setOpenInvoiceSelect(false)
                         }
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedInvoice === invoice.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {invoice.invoiceNo}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      )}

      {/* Vendor Rows */}
      {(mode === undefined || mode === "table-only") && selectedInvoice && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Select vendors:</Label>
          </div>
          
          <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground mb-2">
            <div className="col-span-3">Vendors</div>
            <div className="col-span-2">Total</div>
            <div className="col-span-2">Paid</div>
            <div className="col-span-2">Due</div>
            <div className="col-span-2">Amount</div>
            <div className="col-span-1"></div>
          </div>

          {fields.map((field, index) => {
            const currentVendorId = invoiceVendors?.[index]?.vendorId
            const details = getVendorDetails(currentVendorId)
            
            return (
              <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                {/* Vendor Select */}
                <div className="col-span-3">
                  <Controller
                    control={control}
                    name={`invoiceVendors.${index}.vendorId`}
                    render={({ field }) => (
                      <Select 
                        value={field.value} 
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {vendorOptions.map(v => (
                            <SelectItem key={v.vendor.id} value={v.vendor.id}>
                              {v.vendor.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                {/* Total */}
                <div className="col-span-2">
                  <Input 
                    readOnly 
                    value={details ? details.totalCost : ""} 
                    className="bg-muted"
                  />
                </div>

                {/* Paid */}
                <div className="col-span-2">
                  <Input 
                    readOnly 
                    value={details ? details.paid : ""} 
                    className="bg-muted"
                  />
                </div>

                {/* Due */}
                <div className="col-span-2">
                  <Input 
                    readOnly 
                    value={details ? details.due : ""} 
                    className="bg-muted"
                  />
                </div>

                {/* Amount (Editable) */}
                <div className="col-span-2">
                  <Controller
                    control={control}
                    name={`invoiceVendors.${index}.amount`}
                    render={({ field }) => (
                      <Input 
                        type="number"
                        {...field}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0
                          const capped = details ? Math.min(val, details.due || 0) : val
                          field.onChange(capped)

                          const rows = (getValues("invoiceVendors") || []) as any[]
                          const updatedRows = rows.map((r, i) =>
                            i === index ? { ...r, amount: capped } : r
                          )
                          const total = updatedRows.reduce(
                            (sum, r) => sum + (Number(r?.amount) || 0),
                            0
                          )
                          setValue("invoiceVendors", updatedRows, { shouldDirty: true })
                          setValue("amount", total, { shouldDirty: true })
                        }}
                        max={details ? details.due : undefined}
                        className={cn(
                           (field.value > (details?.due || 0)) && "border-red-500 focus-visible:ring-red-500"
                        )}
                        placeholder="Amount"
                      />
                    )}
                    rules={{
                        validate: (value) => {
                            const d = getVendorDetails(currentVendorId)
                            if (d && value > d.due) return "Exceeds due"
                            return true
                        }
                    }}
                  />
                </div>

                {/* Actions */}
                <div className="col-span-1 flex justify-center pt-1">
                  {index === fields.length - 1 ? (
                    <Button type="button" size="icon" className="h-8 w-8 bg-cyan-500 hover:bg-cyan-600" onClick={() => append({ vendorId: "", amount: 0 })}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button type="button" size="icon" variant="destructive" className="h-8 w-8" onClick={() => remove(index)}>
                      <Minus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
