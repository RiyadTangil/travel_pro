"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { useFormContext, useFieldArray, Controller } from "react-hook-form"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Check, ChevronsUpDown, Plus, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InvoiceOption {
  id: string
  invoiceNo: string
}

interface TicketVendorOption {
  id: string
  name: string
  mobile?: string
  email?: string
}

interface PaymentLineSummary {
  vendor: { id: string; name: string; mobile?: string; email?: string }
  totalCost: number
  paid: number
  due: number
  vendorId?: string
  invoiceItemId?: string
  invoiceId?: string
}

interface SpecificPaymentProps {
  mode?: "select-only" | "table-only"
  disabled?: boolean
  variant?: "invoice" | "ticket"
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SpecificInvoicePayment({
  mode,
  disabled,
  variant = "invoice",
}: SpecificPaymentProps) {
  const { data: session } = useSession()
  const companyId = session?.user?.companyId ?? ""

  const { control, setValue, watch, getValues } = useFormContext()
  const { fields, append, remove } = useFieldArray({ control, name: "invoiceVendors" })

  // Remote option lists
  const [invoiceOptions, setInvoiceOptions] = useState<InvoiceOption[]>([])
  const [ticketVendorList, setTicketVendorList] = useState<TicketVendorOption[]>([])
  const [paymentLines, setPaymentLines] = useState<PaymentLineSummary[]>([])

  // Combobox open state
  const [invoicePopoverOpen, setInvoicePopoverOpen] = useState(false)
  const [ticketVendorPopoverOpen, setTicketVendorPopoverOpen] = useState(false)

  // Watched form values
  const selectedInvoiceId = watch("invoiceId")
  const selectedTicketVendorId = watch("ticketVendorId")
  const invoiceVendors = watch("invoiceVendors")

  // Refs to detect real user-driven changes (prevent reset on initial edit load)
  const prevInvoiceIdRef = useRef<string>(selectedInvoiceId)
  const prevTicketVendorIdRef = useRef<string>(selectedTicketVendorId)

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (variant !== "invoice" || !companyId) return
    fetch("/api/vendors/payment/invoices", { headers: { "x-company-id": companyId } })
      .then((r) => r.json())
      .then((data) => setInvoiceOptions(data.items ?? []))
      .catch(() => setInvoiceOptions([]))
  }, [companyId, variant])

  useEffect(() => {
    if (variant !== "ticket" || !companyId) return
    fetch("/api/vendors/payment/ticket-vendors", { headers: { "x-company-id": companyId } })
      .then((r) => r.json())
      .then((data) => setTicketVendorList(data.items ?? []))
      .catch(() => setTicketVendorList([]))
  }, [companyId, variant])

  useEffect(() => {
    if (variant !== "invoice" || !selectedInvoiceId || !companyId) {
      if (!selectedInvoiceId) setPaymentLines([])
      return
    }
    fetch(`/api/vendors/payment/invoices/${selectedInvoiceId}/vendors`, {
      headers: { "x-company-id": companyId },
    })
      .then((r) => r.json())
      .then((data) => setPaymentLines(data.items ?? []))
      .catch(() => setPaymentLines([]))
  }, [selectedInvoiceId, companyId, variant])

  useEffect(() => {
    if (variant !== "ticket" || !selectedTicketVendorId || !companyId) {
      if (!selectedTicketVendorId) setPaymentLines([])
      return
    }
    fetch(`/api/vendors/payment/ticket-vendors/${selectedTicketVendorId}/lines`, {
      headers: { "x-company-id": companyId },
    })
      .then((r) => r.json())
      .then((data) => setPaymentLines(data.items ?? []))
      .catch(() => setPaymentLines([]))
  }, [selectedTicketVendorId, companyId, variant])

  // ---------------------------------------------------------------------------
  // Reset rows on selection change (only when user actually changes the value,
  // not on initial load from edit data)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (variant !== "invoice") return
    if (selectedInvoiceId && selectedInvoiceId !== prevInvoiceIdRef.current) {
      setValue("invoiceVendors", [{ vendorId: "", amount: 0 }])
    }
    prevInvoiceIdRef.current = selectedInvoiceId
  }, [selectedInvoiceId, setValue, variant])

  useEffect(() => {
    if (variant !== "ticket") return
    if (selectedTicketVendorId && selectedTicketVendorId !== prevTicketVendorIdRef.current) {
      setValue("invoiceVendors", [{ vendorId: selectedTicketVendorId, invoiceItemId: "", amount: 0 }])
    }
    prevTicketVendorIdRef.current = selectedTicketVendorId
  }, [selectedTicketVendorId, setValue, variant])

  // ---------------------------------------------------------------------------
  // Lookup helpers
  // ---------------------------------------------------------------------------

  const getLineByVendorId = (vendorId: string): PaymentLineSummary | undefined =>
    paymentLines.find((l) => l.vendor.id === vendorId)

  const getLineByItemId = (itemId: string): PaymentLineSummary | undefined => {
    if (!itemId) return undefined
    return paymentLines.find((l) => l.invoiceItemId === itemId || l.vendor.id === itemId)
  }

  const getLineForRow = (index: number): PaymentLineSummary | undefined => {
    const row = invoiceVendors?.[index]
    if (!row) return undefined
    return variant === "ticket"
      ? getLineByItemId(row.invoiceItemId)
      : getLineByVendorId(row.vendorId)
  }

  // ---------------------------------------------------------------------------
  // Amount change handler — kept outside JSX for clarity
  // ---------------------------------------------------------------------------

  const handleAmountChange = (rawValue: string, index: number, line: PaymentLineSummary | undefined) => {
    const entered = parseFloat(rawValue) || 0
    const capped = line ? Math.min(entered, line.due) : entered

    const currentRows = (getValues("invoiceVendors") ?? []) as any[]
    const updatedRows = currentRows.map((r, i) => (i === index ? { ...r, amount: capped } : r))
    const total = updatedRows.reduce((sum: number, r: any) => sum + (Number(r?.amount) || 0), 0)

    setValue("invoiceVendors", updatedRows, { shouldDirty: true })
    setValue("amount", total, { shouldDirty: true })

    return capped
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const showSelector = mode === undefined || mode === "select-only"
  const showTable = mode === undefined || mode === "table-only"
  const tableVisible =
    (variant === "invoice" && !!selectedInvoiceId) ||
    (variant === "ticket" && !!selectedTicketVendorId)

  return (
    <div className={cn("space-y-6", mode === "table-only" && "border rounded-md p-4 bg-slate-50")}>

      {/* Invoice selector (invoice variant) */}
      {showSelector && variant === "invoice" && (
        <div className="space-y-2">
          <Label>Select Invoice <span className="text-red-500">*</span></Label>
          <Popover open={invoicePopoverOpen} onOpenChange={setInvoicePopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={invoicePopoverOpen}
                className="w-full justify-between"
                disabled={disabled}
              >
                {selectedInvoiceId
                  ? invoiceOptions.find((i) => i.id === selectedInvoiceId)?.invoiceNo ?? "Select Invoice"
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
                    {invoiceOptions.map((invoice) => (
                      <CommandItem
                        key={invoice.id}
                        value={invoice.invoiceNo}
                        onSelect={(val) => {
                          const found = invoiceOptions.find(
                            (i) => i.invoiceNo.toLowerCase() === val.toLowerCase()
                          )
                          if (found) {
                            setValue("invoiceId", found.id)
                            setInvoicePopoverOpen(false)
                          }
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedInvoiceId === invoice.id ? "opacity-100" : "opacity-0"
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

      {/* Vendor selector (ticket variant) */}
      {showSelector && variant === "ticket" && (
        <div className="space-y-2">
          <Label>Select Vendor <span className="text-red-500">*</span></Label>
          <Popover open={ticketVendorPopoverOpen} onOpenChange={setTicketVendorPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={ticketVendorPopoverOpen}
                className="w-full justify-between"
                disabled={disabled}
              >
                {selectedTicketVendorId
                  ? ticketVendorList.find((v) => v.id === selectedTicketVendorId)?.name ?? "Select vendor"
                  : "Select vendor"}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput placeholder="Search vendor..." />
                <CommandList>
                  <CommandEmpty>No vendor found.</CommandEmpty>
                  <CommandGroup>
                    {ticketVendorList.map((v) => (
                      <CommandItem
                        key={v.id}
                        value={`${v.name} ${v.id}`}
                        onSelect={() => {
                          setValue("ticketVendorId", v.id)
                          setTicketVendorPopoverOpen(false)
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedTicketVendorId === v.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {v.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Payment rows table */}
      {showTable && tableVisible && (
        <div className="space-y-4">
          <Label className="text-base font-semibold">
            {variant === "ticket" ? "Select tickets:" : "Select vendors:"}
          </Label>

          <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground">
            <div className="col-span-3">{variant === "ticket" ? "Tickets" : "Vendors"}</div>
            <div className="col-span-2">Total</div>
            <div className="col-span-2">Paid</div>
            <div className="col-span-2">Due</div>
            <div className="col-span-2">Amount</div>
            <div className="col-span-1" />
          </div>

          {fields.map((field, index) => {
            const line = getLineForRow(index)

            return (
              <div key={field.id} className="grid grid-cols-12 gap-2 items-start">

                {/* First column: vendor select (invoice) or ticket line select (ticket) */}
                <div className="col-span-3">
                  {variant === "invoice" ? (
                    <Controller
                      control={control}
                      name={`invoiceVendors.${index}.vendorId`}
                      render={({ field: ctrl }) => (
                        <Select value={ctrl.value} onValueChange={ctrl.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select vendor..." />
                          </SelectTrigger>
                          <SelectContent>
                            {paymentLines.map((l) => (
                              <SelectItem key={l.vendor.id} value={l.vendor.id}>
                                {l.vendor.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  ) : (
                    <Controller
                      control={control}
                      name={`invoiceVendors.${index}.invoiceItemId`}
                      render={({ field: ctrl }) => (
                        <Select
                          value={ctrl.value}
                          onValueChange={(val) => {
                            ctrl.onChange(val)
                            // Stamp the real vendorId so the service can update vendor balance
                            setValue(`invoiceVendors.${index}.vendorId`, selectedTicketVendorId ?? "")
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select ticket..." />
                          </SelectTrigger>
                          <SelectContent>
                            {paymentLines.map((l) => {
                              const lineId = l.invoiceItemId ?? l.vendor.id
                              return (
                                <SelectItem key={lineId} value={lineId}>
                                  {l.vendor.name}
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  )}
                </div>

                {/* Read-only summary columns */}
                <div className="col-span-2">
                  <Input readOnly value={line?.totalCost ?? ""} className="bg-muted" />
                </div>
                <div className="col-span-2">
                  <Input readOnly value={line?.paid ?? ""} className="bg-muted" />
                </div>
                <div className="col-span-2">
                  <Input readOnly value={line?.due ?? ""} className="bg-muted" />
                </div>

                {/* Editable amount */}
                <div className="col-span-2">
                  <Controller
                    control={control}
                    name={`invoiceVendors.${index}.amount`}
                    rules={{
                      validate: (value) =>
                        !line || Number(value) <= line.due ? true : "Exceeds due amount",
                    }}
                    render={({ field: ctrl }) => (
                      <Input
                        type="number"
                        value={ctrl.value}
                        onChange={(e) => {
                          const capped = handleAmountChange(e.target.value, index, line)
                          ctrl.onChange(capped)
                        }}
                        onBlur={ctrl.onBlur}
                        max={line?.due}
                        placeholder="Amount"
                        className={cn(
                          Number(ctrl.value) > (line?.due ?? 0) && line !== undefined &&
                            "border-red-500 focus-visible:ring-red-500"
                        )}
                      />
                    )}
                  />
                </div>

                {/* Add / remove row */}
                <div className="col-span-1 flex justify-center pt-1">
                  {index === fields.length - 1 ? (
                    <Button
                      type="button"
                      size="icon"
                      className="h-8 w-8 bg-cyan-500 hover:bg-cyan-600"
                      onClick={() =>
                        append(
                          variant === "ticket"
                            ? { vendorId: selectedTicketVendorId ?? "", invoiceItemId: "", amount: 0 }
                            : { vendorId: "", amount: 0 }
                        )
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="h-8 w-8"
                      onClick={() => remove(index)}
                    >
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
