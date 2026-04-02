"use client"

import { useState, useCallback, useMemo, useEffect, memo, useRef, startTransition } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { 
  X, 
  Plus,
  Trash2,
  FileText,
  User,
  CreditCard,
  MapPin,
  Calendar,
  Settings
} from "lucide-react"
import { cn } from "@/lib/utils"
import { DateInput } from "@/components/ui/date-input"
import ClientSelect from "@/components/clients/client-select"
import EmployeeSelect from "@/components/employees/employee-select"
import AgentSelect from "@/components/agents/agent-select"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/hooks/use-toast"
import { CustomDropdown } from "./custom-dropdown"
import VendorSelect from "@/components/vendors/vendor-select"
import { PassportInformation } from "./passport-information"
import { BillingInformation } from "./billing-information"
import { MoneyReceipt } from "./money-receipt"

const visaTypeOptions = ["Tourist", "Business", "Student", "Work", "Family", "Other"]

interface AddVisaInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  onInvoiceAdded?: (data: any) => void
  initialInvoiceId?: string | null
}

const formSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  employeeId: z.string().min(1, "Sales By is required"),
  invoiceNo: z.string().min(1, "Invoice No is required"),
  salesDate: z.date({ required_error: "Sales Date is required" }),
  dueDate: z.date().optional(),
  agentId: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

export const parseYmdLocal = (s?: string): Date | undefined => {
  if (!s) return undefined
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})/.exec(s)
  if (!m) return new Date(s)
  const y = Number(m[1]); const mo = Number(m[2]); const d = Number(m[3])
  if (!isFinite(y) || !isFinite(mo) || !isFinite(d)) return new Date(s)
  return new Date(y, mo - 1, d)
}

export const toYmd = (d: Date): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${da}`
}

export function AddVisaInvoiceModal({ 
  isOpen, 
  onClose, 
  onInvoiceAdded, 
  initialInvoiceId 
}: AddVisaInvoiceModalProps) {
  const [loading, setLoading] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  
  // Data states for child sections
  const [passportData, setPassportData] = useState<any[]>([])
  const [billingData, setBillingData] = useState<any>(null)
  const [moneyReceiptData, setMoneyReceiptData] = useState<any>(null)
  
  // Prefill states for child sections
  const [initialPassports, setInitialPassports] = useState<any[] | undefined>(undefined)
  const [initialBillingItems, setInitialBillingItems] = useState<any[] | undefined>(undefined)
  const [initialBillingTotals, setInitialBillingTotals] = useState<any | undefined>(undefined)

  // Preloaded lookups
  const [clientsPreloaded, setClientsPreloaded] = useState<any[]>([])
  const [employeesPreloaded, setEmployeesPreloaded] = useState<any[]>([])
  const [agentsPreloaded, setAgentsPreloaded] = useState<any[]>([])
  const [vendorsPreloaded, setVendorsPreloaded] = useState<any[]>([])

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors: formErrors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: "",
      employeeId: "",
      invoiceNo: "",
      salesDate: new Date(),
      dueDate: undefined,
      agentId: "",
    },
  })

  // Watch for logic
  const employeeId = watch("employeeId")

  // Fetch Global Lookups (for Create mode)
  useEffect(() => {
    if (!isOpen || initialInvoiceId) return
    const fetchLookups = async () => {
      try {
        const [clientRes, empRes, agentRes] = await Promise.all([
          fetch('/api/clients-manager?limit=1000'),
          fetch('/api/employees?limit=500'),
          fetch('/api/agents?limit=500')
        ])
        const [clientData, empData, agentData] = await Promise.all([
          clientRes.json(), empRes.json(), agentRes.json()
        ])
        setClientsPreloaded(clientData.clients || [])
        setEmployeesPreloaded(empData.employees || [])
        setAgentsPreloaded(agentData.data || [])
      } catch (e) {
        console.error("Failed to fetch lookups", e)
      }
    }
    fetchLookups()
  }, [isOpen, initialInvoiceId])

  // Fetch initial data if editing
  useEffect(() => {
    if (initialInvoiceId && isOpen && !hasFetched) {
      const fetchInvoice = async () => {
        setLoading(true)
        try {
          const res = await fetch(`/api/invoices/visa/${initialInvoiceId}`)
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || "Failed to fetch invoice")
          
          const inv = data.invoice
          if (!inv) return

          // 1. Populate Form Header
          setValue("clientId", inv.clientId)
          setValue("employeeId", inv.employeeId)
          setValue("agentId", inv.agentId || "")
          setValue("invoiceNo", inv.invoiceNo)
          if (inv.salesDate) setValue("salesDate", parseYmdLocal(inv.salesDate)!)
          if (inv.dueDate) setValue("dueDate", parseYmdLocal(inv.dueDate)!)
          
          // 2. Populate Child Section Initial States
          setInitialPassports(inv.passports || [])
          setInitialBillingTotals(inv.billing || {})
          setInitialBillingItems((inv.billing?.items || []).map((i: any, idx: number) => ({ 
            id: i.id || String(Date.now() + idx), 
            ...i, 
            vendor: i.vendor ?? i.vendorId ?? "" 
          })))

          // 3. Preload lookup lists returned from API to avoid extra fetches
          if (Array.isArray(data.clients)) setClientsPreloaded(data.clients)
          if (Array.isArray(data.employees)) setEmployeesPreloaded(data.employees)
          if (Array.isArray(data.agents)) setAgentsPreloaded(data.agents)
          if (Array.isArray(data.vendors)) setVendorsPreloaded(data.vendors)

          setHasFetched(true)
        } catch (e: any) {
          toast({ title: "Error", description: e.message, variant: "destructive" })
          onClose()
        } finally {
          setLoading(false)
        }
      }
      fetchInvoice()
    } else if (isOpen && !initialInvoiceId) {
      // Fetch next invoice number for Create mode
      const fetchNextNo = async () => {
        try {
          const res = await fetch('/api/invoices/next-no?type=visa')
          const data = await res.json()
          if (data.nextInvoiceNo) {
            setValue("invoiceNo", data.nextInvoiceNo)
          }
        } catch (e) {}
      }
      fetchNextNo()
    }
  }, [initialInvoiceId, isOpen, setValue, hasFetched, onClose])

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setHasFetched(false)
      setInitialPassports(undefined)
      setInitialBillingItems(undefined)
      setInitialBillingTotals(undefined)
      setPassportData([])
      setBillingData(null)
      setMoneyReceiptData(null)
      reset({
        clientId: "",
        employeeId: "",
        invoiceNo: "",
        salesDate: new Date(),
        dueDate: undefined,
        agentId: "",
      })
    }
  }, [isOpen, reset])

  const onPassportChange = useCallback((p: any[]) => { startTransition(() => setPassportData(p)) }, [])
  const onBillingChange = useCallback((p: { items: any[]; totals: any }) => {
    startTransition(() => {
      setBillingData({ items: p.items, totals: p.totals })
    })
  }, [])

  const onSubmit = async (data: FormData) => {
    try {
      const billingItems = billingData?.items || []
      if (billingItems.length === 0) {
        toast({ title: "Validation Error", description: "At least one billing item is required", variant: "destructive" })
        return
      }

      setLoading(true)
      const payload = {
        general: {
          ...data,
          salesDate: toYmd(data.salesDate),
          dueDate: data.dueDate ? toYmd(data.dueDate) : "",
        },
        passport: passportData,
        billing: {
          items: billingItems,
          ...(billingData?.totals || {})
        },
        moneyReceipt: moneyReceiptData,
        invoiceType: "visa"
      }
      
      const url = initialInvoiceId ? `/api/invoices/visa/${initialInvoiceId}` : '/api/invoices/visa'
      const method = initialInvoiceId ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Failed to save invoice")
      
      toast({ title: "Success", description: `Invoice ${initialInvoiceId ? 'updated' : 'created'} successfully` })
      onInvoiceAdded?.(result)
      onClose()
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[98vw] w-[98vw] h-[95vh] max-h-[95vh] p-0 flex flex-col overflow-hidden bg-gray-50">
        <DialogHeader className="px-6 py-3 border-b bg-white shrink-0">
          <DialogTitle className="text-lg font-bold text-gray-800">
            {initialInvoiceId ? "Edit Visa Invoice" : "Add Visa Invoice"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {/* General Information */}
              <Card className="border-none shadow-sm">
                <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Client <span className="text-red-500">*</span></Label>
                    <Controller
                      name="clientId"
                      control={control}
                      render={({ field }) => (
                        <ClientSelect 
                          value={field.value} 
                          onChange={field.onChange} 
                          preloaded={clientsPreloaded}
                          disabled={!!initialInvoiceId}
                        />
                      )}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Sales By <span className="text-red-500">*</span></Label>
                    <Controller
                      name="employeeId"
                      control={control}
                      render={({ field }) => (
                        <EmployeeSelect 
                          value={field.value} 
                          onChange={field.onChange} 
                          preloaded={employeesPreloaded}
                        />
                      )}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Invoice No</Label>
                    <Controller
                      name="invoiceNo"
                      control={control}
                      render={({ field }) => <Input {...field} readOnly className="h-9 bg-gray-100" />}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Sales Date <span className="text-red-500">*</span></Label>
                    <Controller
                      name="salesDate"
                      control={control}
                      render={({ field }) => <DateInput value={field.value} onChange={field.onChange} />}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Due Date</Label>
                    <Controller
                      name="dueDate"
                      control={control}
                      render={({ field }) => <DateInput value={field.value} onChange={field.onChange} />}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Agent</Label>
                    <Controller
                      name="agentId"
                      control={control}
                      render={({ field }) => (
                        <AgentSelect 
                          value={field.value} 
                          onChange={field.onChange} 
                          preloaded={agentsPreloaded}
                        />
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Passport Information */}
              <PassportInformation 
                initialEntries={initialPassports} 
                onChange={onPassportChange} 
              />

              {/* Billing & Visa Information */}
              <BillingInformation 
                invoiceType="visa"
                initialItems={initialBillingItems}
                initialTotals={initialBillingTotals}
                vendorPreloaded={vendorsPreloaded}
                onChange={onBillingChange}
              />

              {/* Money Receipt */}
              <MoneyReceipt 
                onChange={setMoneyReceiptData}
                initialData={moneyReceiptData}
              />
            </div>
          </ScrollArea>

          <div className="p-4 border-t bg-white flex justify-end gap-3 shrink-0">
            <Button variant="outline" type="button" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : (initialInvoiceId ? "Update Invoice" : "Create Invoice")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
