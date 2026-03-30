"use client"

import { useState, useCallback, useMemo, useEffect, memo, useRef } from "react"
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
import { Card } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { 
  X, 
  CreditCard,
  Copy,
  Edit2,
  Trash2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { DateInput } from "@/components/ui/date-input"
import ClientSelect from "@/components/clients/client-select"
import EmployeeSelect from "@/components/employees/employee-select"
import AgentSelect from "@/components/agents/agent-select"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/hooks/use-toast"

// Sub-components
import { NonCommissionTicketDetails, TicketDetailsData } from "./non-commission-ticket-details"
import { NonCommissionPaxInformation, PaxEntry } from "./non-commission-pax-information"
import { NonCommissionFlightInformation, FlightEntry } from "./non-commission-flight-information"

interface InvoiceItem {
  id: string
  ticketDetails: TicketDetailsData
  paxEntries: PaxEntry[]
  flightEntries: FlightEntry[]
  profit: number
}

interface AddNonCommissionModalProps {
  isOpen: boolean
  onClose: () => void
  onInvoiceAdded?: (data: any) => void
  initialInvoiceId?: string | null
}

const formSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  employeeId: z.string().min(1, "Sales person is required"),
  agentId: z.string().optional(),
  invoiceNo: z.string().min(1, "Invoice No is required"),
  salesDate: z.date({ required_error: "Sales date is required" }),
  dueDate: z.date().optional(),
  billing: z.object({
    discount: z.number().default(0),
    serviceCharge: z.number().default(0),
    vatTax: z.number().default(0),
    agentCommission: z.number().default(0),
    reference: z.string().default(""),
    note: z.string().default(""),
    showPrevDue: z.enum(["Yes", "No"]).default("No"),
    showDiscount: z.enum(["Yes", "No"]).default("No"),
  })
})

type FormData = z.infer<typeof formSchema>

export function AddNonCommissionModal({ 
  isOpen, 
  onClose, 
  onInvoiceAdded, 
  initialInvoiceId 
}: AddNonCommissionModalProps) {
  // --- react-hook-form ---
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors: formErrors, isSubmitting: submittingState },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: "",
      employeeId: "",
      agentId: "",
      invoiceNo: "",
      salesDate: new Date(),
      dueDate: undefined,
      billing: {
        discount: 0,
        serviceCharge: 0,
        vatTax: 0,
        agentCommission: 0,
        reference: "",
        note: "",
        showPrevDue: "No",
        showDiscount: "No"
      }
    }
  })

  const clientId = watch("clientId")
  const employeeId = watch("employeeId")
  const agentId = watch("agentId")
  const invoiceNo = watch("invoiceNo")
  const salesDate = watch("salesDate")
  const dueDate = watch("dueDate")
  const billing = watch("billing")

  // --- General State ---
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(false)

  // List of added items (for the right summary table)
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [resetKey, setResetKey] = useState(0)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const hasFetched = useRef(false)

  // --- API Data Hooks ---
  const [airlineOptions, setAirlineOptions] = useState<string[]>([])
  const [airportList, setAirportList] = useState<any[]>([])
  const [passportsPreloaded, setPassportsPreloaded] = useState<any[]>([])
  const [clientsPreloadedAll, setClientsPreloadedAll] = useState<any[]>([])
  const [employeesPreloadedAll, setEmployeesPreloadedAll] = useState<any[]>([])
  const [agentsPreloadedAll, setAgentsPreloadedAll] = useState<any[]>([])

  useEffect(() => {
    if (!isOpen) {
      hasFetched.current = false
      // Clear state when modal closes
      reset({
        clientId: "",
        employeeId: "",
        agentId: "",
        invoiceNo: "",
        salesDate: new Date(),
        dueDate: undefined,
        billing: {
          discount: 0,
          serviceCharge: 0,
          vatTax: 0,
          agentCommission: 0,
          note: "",
          reference: "",
          showPrevDue: "No",
          showDiscount: "No"
        }
      })
      setItems([])
      setEditingItemId(null)
      setTicketDetails({
        ticketNo: "",
        clientPrice: 0,
        purchasePrice: 0,
        extraFee: 0,
        vendor: "",
        airline: "",
        ticketType: "",
        route: "",
        pnr: "",
        gdsPnr: "",
        paxName: "",
        issueDate: new Date(),
        airbusClass: ""
      })
      setPaxEntries([])
      setFlightEntries([])
      setErrors({})
      return
    }

    const fetchLookups = async () => {
      try {
        const [airRes, portRes, passRes, clientRes, empRes, agentRes] = await Promise.all([
          fetch('/api/airlines?limit=500'),
          fetch('/api/airports?limit=500'),
          fetch('/api/passports?limit=500'),
          fetch('/api/clients-manager?limit=1000'),
          fetch('/api/employees?limit=500'),
          fetch('/api/agents?limit=500')
        ])
        const [airData, portData, passData, clientData, empData, agentData] = await Promise.all([
          airRes.json(), portRes.json(), passRes.json(), clientRes.json(), empRes.json(), agentRes.json()
        ])
        setAirlineOptions((airData.items || []).map((a: any) => a.name))
        setAirportList(portData.items || [])
        setPassportsPreloaded(passData.items || [])
        setClientsPreloadedAll(clientData.clients || [])
        setEmployeesPreloadedAll(empData.employees || [])
        setAgentsPreloadedAll(agentData.data || [])
      } catch (e) {
        console.error("Failed to fetch lookups", e)
      }
    }
    fetchLookups()
  }, [isOpen, reset])

  // Fetch invoice if in Edit mode
  useEffect(() => {
    if (initialInvoiceId && isOpen && !hasFetched.current) {
      const fetchInvoice = async () => {
        setLoading(true)
        try {
          const res = await fetch(`/api/invoices/non-commission/${initialInvoiceId}`)
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || "Failed to fetch invoice")

          hasFetched.current = true
          // Populate states
          setValue("clientId", data.clientId)
          setValue("employeeId", data.employeeId)
          setValue("agentId", data.agentId || "")
          setValue("invoiceNo", data.invoiceNo)
          setValue("salesDate", data.salesDate ? new Date(data.salesDate) : new Date())
          if (data.dueDate) setValue("dueDate", new Date(data.dueDate))
          setItems(data.items || [])
          setValue("billing", {
            discount: data.billing?.discount || 0,
            serviceCharge: data.billing?.serviceCharge || 0,
            vatTax: data.billing?.vatTax || 0,
            agentCommission: data.agentCommission || 0,
            note: data.billing?.note || "",
            reference: data.billing?.reference || "",
            showPrevDue: data.showPrevDue ? "Yes" : "No",
            showDiscount: data.showDiscount ? "Yes" : "No"
          })
        } catch (e: any) {
          toast({ title: "Error", description: e.message, variant: "destructive" })
          onClose()
        } finally {
          setLoading(false)
        }
      }
      fetchInvoice()
    } else if (isOpen && !initialInvoiceId) {
      // Fetch next invoice number for NEW mode
      const fetchNextNo = async () => {
        try {
          const res = await fetch('/api/invoices/next-no?type=non_commission')
          const data = await res.json()
          if (data.nextInvoiceNo) {
            setValue("invoiceNo", data.nextInvoiceNo)
          }
        } catch (e) {}
      }
      fetchNextNo()
    }
    // Only run when isOpen changes or initialInvoiceId changes. 
    // Do NOT add setValue, onClose to dependencies as they might be unstable in parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialInvoiceId, isOpen])

  // Data states for "current" item in forms
  const [ticketDetails, setTicketDetails] = useState<TicketDetailsData>({
    ticketNo: "",
    clientPrice: 0,
    purchasePrice: 0,
    extraFee: 0,
    vendor: "",
    airline: "",
    ticketType: "",
    route: "",
    pnr: "",
    gdsPnr: "",
    paxName: "",
    issueDate: new Date(),
    airbusClass: ""
  })

  const [paxEntries, setPaxEntries] = useState<PaxEntry[]>([])
  const [flightEntries, setFlightEntries] = useState<PaxEntry[]>([])

  // --- Calculations ---
  // Total prices summed from all items in the list
  const totalClientPrice = useMemo(() => items.reduce((sum, item) => sum + item.ticketDetails.clientPrice, 0), [items])
  const totalPurchasePrice = useMemo(() => items.reduce((sum, item) => sum + item.ticketDetails.purchasePrice, 0), [items])
  const totalExtraFee = useMemo(() => items.reduce((sum, item) => sum + item.ticketDetails.extraFee, 0), [items])
  const totalProfit = useMemo(() => items.reduce((sum, item) => sum + item.profit, 0), [items])

  const calculatedNetTotal = useMemo(() => {
    return totalClientPrice - (billing.discount || 0) + (billing.serviceCharge || 0) + (billing.vatTax || 0) + totalExtraFee
  }, [totalClientPrice, billing.discount, billing.serviceCharge, billing.vatTax, totalExtraFee])

  // --- Callbacks for sub-components ---
  const onTicketChange = useCallback((data: TicketDetailsData) => {
    setTicketDetails(data)
  }, [])

  const onPaxChange = useCallback((entries: PaxEntry[]) => {
    setPaxEntries(entries)
  }, [])

  const onFlightChange = useCallback((entries: FlightEntry[]) => {
    setFlightEntries(entries)
  }, [])

  // --- Validation & Actions ---
  const validateItem = () => {
    const newErrors: Record<string, string> = {}
    
    // Ticket
    if (!ticketDetails.ticketNo) newErrors.ticketNo = "Ticket No is required"
    if (!ticketDetails.clientPrice) newErrors.clientPrice = "Client Price is required"
    if (!ticketDetails.purchasePrice) newErrors.purchasePrice = "Purchase Price is required"
    if (!ticketDetails.vendor) newErrors.vendor = "Vendor is required"
    if (!ticketDetails.airline) newErrors.airline = "Airline is required"
    if (!ticketDetails.paxName) newErrors.paxName = "Pax Name is required"

    // Pax (At least one pax name required if pax section is used)
    // paxEntries.forEach((p, i) => {
    //   if (!p.name) newErrors[`pax[${i}].name`] = "Name is required"
    // })

    // Flight (Optional but if started must be valid)
    flightEntries.forEach((f, i) => {
      const hasAny = f.from || f.to || f.airline || f.flightNo || f.flyDate || f.departureTime || f.arrivalTime
      if (hasAny) {
        if (!f.from) newErrors[`flight[${i}].from`] = "From is required"
        if (!f.to) newErrors[`flight[${i}].to`] = "To is required"
        if (!f.airline) newErrors[`flight[${i}].airline`] = "Airline is required"
        if (!f.flightNo) newErrors[`flight[${i}].flightNo`] = "Flight No is required"
        if (!f.flyDate) newErrors[`flight[${i}].flyDate`] = "Fly Date is required"
      }
    })
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleAddNew = () => {
    if (!validateItem()) {
      toast({ title: "Validation Error", description: "Please fill required item details", variant: "destructive" })
      return
    }

    const currentProfit = (ticketDetails.clientPrice || 0) - (ticketDetails.purchasePrice || 0) + (ticketDetails.extraFee || 0)
    
    // We must ensure the item object sent to the list matches the shape expected by the API
    const updatedItem: InvoiceItem = {
      id: editingItemId || Date.now().toString(),
      ticketDetails: JSON.parse(JSON.stringify(ticketDetails)),
      paxEntries: JSON.parse(JSON.stringify(paxEntries)),
      flightEntries: JSON.parse(JSON.stringify(flightEntries)),
      profit: currentProfit
    }

    if (editingItemId) {
      // Update existing item in the list
      setItems(prev => {
        const newList = prev.map(item => item.id === editingItemId ? updatedItem : item)
        console.log("Updated list (Edit):", newList)
        return newList
      })
      setEditingItemId(null)
      toast({ title: "Item Updated", description: "Item has been updated in the list" })
    } else {
      // Add new item to the list
      setItems(prev => {
        const newList = [...prev, updatedItem]
        console.log("Updated list (Add):", newList)
        return newList
      })
    }
    
    // Reset "current" form data but keep General Info
    setResetKey(prev => prev + 1)
    setTicketDetails({
      ticketNo: "",
      clientPrice: 0,
      purchasePrice: 0,
      extraFee: 0,
      vendor: "",
      airline: "",
      ticketType: "",
      route: "",
      pnr: "",
      gdsPnr: "",
      paxName: "",
      issueDate: new Date(),
      airbusClass: ""
    })
    setPaxEntries([])
    setFlightEntries([])
    setErrors({})
  }

  const handleEditItem = (item: InvoiceItem) => {
    // Populate form with item data
    setTicketDetails(item.ticketDetails)
    setPaxEntries(item.paxEntries)
    setFlightEntries(item.flightEntries)
    setEditingItemId(item.id)
    
    // Trigger resetKey to re-mount sub-components with the new initial data
    setResetKey(prev => prev + 1)
    
    toast({ title: "Editing Item", description: "You can now modify the item details in the form" })
  }

  const handleCopyItem = (item: InvoiceItem) => {
    // Just move item data to form, keep item in list
    setTicketDetails({ ...item.ticketDetails, ticketNo: "" }) // clear ticket no for copy usually
    setPaxEntries([...item.paxEntries])
    setFlightEntries([...item.flightEntries])
    setResetKey(prev => prev + 1)
  }

  const handleDeleteItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const handleCreate = handleSubmit(async (data: FormData) => {
    if (items.length === 0) {
      toast({ title: "Error", description: "Please add at least one item", variant: "destructive" })
      return
    }
    
    setSubmitting(true)
    try {
      const payload = {
        general: { 
          clientId: data.clientId, 
          employeeId: data.employeeId, 
          agentId: data.agentId, 
          invoiceNo: data.invoiceNo, 
          salesDate: data.salesDate, 
          dueDate: data.dueDate 
        },
        items,
        billing: {
          ...data.billing,
          subtotal: totalClientPrice,
          netTotal: calculatedNetTotal,
        },
      }
      
      const url = initialInvoiceId 
        ? `/api/invoices/non-commission/${initialInvoiceId}`
        : '/api/invoices/non-commission'
      
      const res = await fetch(url, {
        method: initialInvoiceId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      const resData = await res.json()
      if (!res.ok) throw new Error(resData.error || 'Failed to save invoice')
      
      toast({ title: "Success", description: `Non-Commission Invoice ${initialInvoiceId ? 'updated' : 'created'} successfully` })
      onInvoiceAdded?.(resData)
      onClose()
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  })

  const handleCreatePreview = async () => {
    handleCreate()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[98vw] w-[98vw] h-[95vh] max-h-[95vh] p-0 flex flex-col overflow-hidden bg-gray-50">
        <DialogHeader className="px-6 py-3 border-b bg-white flex flex-row items-center justify-between shrink-0">
          <DialogTitle className="text-lg font-bold text-gray-800">
            {initialInvoiceId ? "Edit Non-Commission Invoice" : "Add Non-Commission Invoice"}
          </DialogTitle>
          
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Main Scrollable Area for Forms */}
          <ScrollArea className="flex-[3] h-full border-r bg-gray-50/30">
            <div className="p-6 space-y-6">
              {/* General Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">Search Client <span className="text-red-500">*</span></Label>
                  <Controller
                    name="clientId"
                    control={control}
                    render={({ field }) => (
                      <ClientSelect 
                        value={field.value} 
                        onChange={id => field.onChange(id)} 
                        placeholder="Search Client"
                        className={cn("h-9 text-xs", formErrors.clientId && "border-red-500")}
                        preloaded={clientsPreloadedAll}
                        disabled={!!initialInvoiceId}
                      />
                    )}
                  />
                  {formErrors.clientId && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.clientId.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">Sales By <span className="text-red-500">*</span></Label>
                  <Controller
                    name="employeeId"
                    control={control}
                    render={({ field }) => (
                      <EmployeeSelect 
                        value={field.value} 
                        onChange={id => field.onChange(id)} 
                        placeholder="Select employee"
                        className={cn("h-9 text-xs", formErrors.employeeId && "border-red-500")}
                        preloaded={employeesPreloadedAll}
                      />
                    )}
                  />
                  {formErrors.employeeId && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.employeeId.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">Invoice No</Label>
                  <Controller
                    name="invoiceNo"
                    control={control}
                    render={({ field }) => (
                      <Input {...field} readOnly className="h-9 text-xs bg-gray-100" />
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">Sales Date <span className="text-red-500">*</span></Label>
                  <Controller
                    name="salesDate"
                    control={control}
                    render={({ field }) => (
                      <DateInput 
                        value={field.value} 
                        onChange={d => field.onChange(d)} 
                        className={cn("h-9 text-xs", formErrors.salesDate && "border-red-500")} 
                      />
                    )}
                  />
                  {formErrors.salesDate && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.salesDate.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">Due Date</Label>
                  <Controller
                    name="dueDate"
                    control={control}
                    render={({ field }) => (
                      <DateInput value={field.value} onChange={field.onChange} className="h-9 text-xs" />
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">Select Agent</Label>
                  <Controller
                    name="agentId"
                    control={control}
                    render={({ field }) => (
                      <AgentSelect 
                        value={field.value} 
                        onChange={field.onChange} 
                        placeholder="Select Agent"
                        className="h-9 text-xs"
                        preloaded={agentsPreloadedAll}
                      />
                    )}
                  />
                </div>
              </div>

              {/* Ticket Details Component */}
              <NonCommissionTicketDetails 
                key={`ticket-${resetKey}`}
                initialData={ticketDetails}
                airlineOptions={airlineOptions}
                airportList={airportList}
                onChange={onTicketChange}
                errors={errors}
              />

              {/* Pax & Passport Details Component */}
              <NonCommissionPaxInformation 
                key={`pax-${resetKey}`}
                initialEntries={paxEntries}
                onChange={onPaxChange}
                passportsPreloaded={passportsPreloaded}
                errors={errors}
              />

              {/* Flight Details Component */}
              <NonCommissionFlightInformation 
                key={`flight-${resetKey}`}
                initialEntries={flightEntries}
                onChange={onFlightChange}
                errors={errors}
                airlineOptions={airlineOptions}
                airportList={airportList}
              />

              {/* Add New Button at bottom of forms */}
              <div className="flex justify-end gap-3 pt-4 pb-8">
                {editingItemId && (
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setEditingItemId(null)
                      setResetKey(prev => prev + 1)
                      setTicketDetails({
                        ticketNo: "",
                        clientPrice: 0,
                        purchasePrice: 0,
                        extraFee: 0,
                        vendor: "",
                        airline: "",
                        ticketType: "",
                        route: "",
                        pnr: "",
                        gdsPnr: "",
                        paxName: "",
                        issueDate: new Date(),
                        airbusClass: ""
                      })
                      setPaxEntries([])
                      setFlightEntries([])
                      setErrors({})
                    }}
                    className="rounded-md px-6 text-xs h-9 font-bold border-amber-200 text-amber-600 hover:bg-amber-50"
                  >
                    Cancel Edit
                  </Button>
                )}
                <Button 
                  onClick={handleAddNew}
                  className={cn(
                    "rounded-md px-8 text-xs h-9 font-bold",
                    editingItemId ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-sky-400 hover:bg-sky-500 text-white"
                  )}
                >
                  {editingItemId ? "Update Item" : "Add New"}
                </Button>
              </div>
            </div>
          </ScrollArea>

          {/* Right Column (Summary & Payment) - Persistent */}
          <div className="flex-1 h-full bg-white flex flex-col overflow-hidden">
            <ScrollArea className="flex-1">
              <div className="p-5 space-y-4">
                {/* Items Table Summary */}
                <Card className="border-none shadow-sm overflow-hidden rounded-lg">
                  <div className="bg-gray-100/80 px-3 py-2.5 grid grid-cols-[30px_1fr_60px_60px_60px_80px] gap-1 text-[10px] font-bold text-gray-600 border-b uppercase tracking-tight">
                    <span>SL.</span>
                    <span>Ticket No</span>
                    <span className="text-right">Client</span>
                    <span className="text-right">Vendor</span>
                    <span className="text-right">Profit</span>
                    <span className="text-center">Action</span>
                  </div>
                  <div className="min-h-[120px] bg-white divide-y divide-gray-50">
                    {items.length > 0 ? (
                      items.map((item, index) => (
                        <div key={item.id} className="px-3 py-2 grid grid-cols-[30px_1fr_60px_60px_60px_80px] gap-1 text-[11px] text-gray-700 items-center hover:bg-gray-50/50 group">
                          <span className="text-gray-400">{index + 1}</span>
                          <span className="truncate font-medium">{item.ticketDetails.ticketNo}</span>
                          <span className="text-right">{item.ticketDetails.clientPrice.toLocaleString()}</span>
                          <span className="text-right">{item.ticketDetails.purchasePrice.toLocaleString()}</span>
                          <span className={cn("text-right font-bold", item.profit >= 0 ? "text-green-600" : "text-red-600")}>
                            {item.profit.toLocaleString()}
                          </span>
                          <div className="flex items-center justify-center gap-1.5">
                            <button 
                              onClick={() => handleCopyItem(item)}
                              className="p-1 hover:text-sky-500 text-gray-400 transition-colors"
                              title="Copy"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button 
                              onClick={() => handleEditItem(item)}
                              className="p-1 hover:text-amber-500 text-gray-400 transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button 
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1 hover:text-red-500 text-gray-400 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="h-[120px] flex flex-col items-center justify-center text-gray-400 italic text-[11px]">
                        <CreditCard className="h-6 w-6 mb-1 opacity-20" />
                        No items added
                      </div>
                    )}
                  </div>
                  <div className="bg-gray-50/80 p-2.5 border-t grid grid-cols-[30px_1fr_60px_60px_60px_80px] gap-1 text-[10px] font-bold text-gray-700">
                    <span className="col-span-2 text-right pr-2">Total :</span>
                    <span className="text-right">{totalClientPrice.toLocaleString()}</span>
                    <span className="text-right">{totalPurchasePrice.toLocaleString()}</span>
                    <span className="text-right text-green-600">{totalProfit.toLocaleString()}</span>
                    <span></span>
                  </div>
                </Card>

                {/* Billing Section */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Subtotal</Label>
                      <Input value={totalClientPrice.toFixed(2)} readOnly className="h-8 text-xs bg-gray-50 font-semibold" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Discount</Label>
                      <Controller
                        name="billing.discount"
                        control={control}
                        render={({ field }) => (
                          <Input 
                            type="number" 
                            value={field.value} 
                            onChange={e => field.onChange(Number(e.target.value))} 
                            className="h-8 text-xs" 
                          />
                        )}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Service Charge</Label>
                      <Controller
                        name="billing.serviceCharge"
                        control={control}
                        render={({ field }) => (
                          <Input 
                            type="number" 
                            value={field.value} 
                            onChange={e => field.onChange(Number(e.target.value))} 
                            className="h-8 text-xs" 
                          />
                        )}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">VAT/Tax</Label>
                      <Controller
                        name="billing.vatTax"
                        control={control}
                        render={({ field }) => (
                          <Input 
                            type="number" 
                            value={field.value} 
                            onChange={e => field.onChange(Number(e.target.value))} 
                            className="h-8 text-xs" 
                          />
                        )}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Net Total</Label>
                      <Input value={calculatedNetTotal.toFixed(2)} readOnly className="h-8 text-xs bg-sky-50 text-sky-700 font-bold border-sky-200" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Agent Commission</Label>
                      <Controller
                        name="billing.agentCommission"
                        control={control}
                        render={({ field }) => (
                          <Input 
                            type="number" 
                            value={field.value} 
                            onChange={e => field.onChange(Number(e.target.value))} 
                            className="h-8 text-xs" 
                          />
                        )}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Reference</Label>
                      <Controller
                        name="billing.reference"
                        control={control}
                        render={({ field }) => (
                          <Input {...field} placeholder="Enter reference" className="h-8 text-xs" />
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Note</Label>
                    <Controller
                      name="billing.note"
                      control={control}
                      render={({ field }) => (
                        <textarea 
                          {...field}
                          className="w-full min-h-[60px] p-2 text-xs border rounded-md focus:outline-none focus:ring-1 focus:ring-sky-400 bg-gray-50/30" 
                          placeholder="Add notes here..."
                        />
                      )}
                    />
                  </div>

                  <div className="space-y-3 pt-1">
                    <div className="flex flex-col gap-2">
                      <Label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Show Prev Due</Label>
                      <Controller
                        name="billing.showPrevDue"
                        control={control}
                        render={({ field }) => (
                          <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-4">
                            <div className="flex items-center space-x-1.5">
                              <RadioGroupItem value="Yes" id="prev-yes" className="h-3 w-3" />
                              <Label htmlFor="prev-yes" className="text-[10px] font-medium">Yes</Label>
                            </div>
                            <div className="flex items-center space-x-1.5">
                              <RadioGroupItem value="No" id="prev-no" className="h-3 w-3" />
                              <Label htmlFor="prev-no" className="text-[10px] font-medium">No</Label>
                            </div>
                          </RadioGroup>
                        )}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Show Discount</Label>
                      <Controller
                        name="billing.showDiscount"
                        control={control}
                        render={({ field }) => (
                          <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-4">
                            <div className="flex items-center space-x-1.5">
                              <RadioGroupItem value="Yes" id="disc-yes" className="h-3 w-3" />
                              <Label htmlFor="disc-yes" className="text-[10px] font-medium">Yes</Label>
                            </div>
                            <div className="flex items-center space-x-1.5">
                              <RadioGroupItem value="No" id="disc-no" className="h-3 w-3" />
                              <Label htmlFor="disc-no" className="text-[10px] font-medium">No</Label>
                            </div>
                          </RadioGroup>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* Fixed Action Buttons at Bottom of Right Column */}
            <div className="p-5 border-t bg-gray-50/50 space-y-3">
              <Button variant="outline" className="w-full h-8 text-[11px] border-dashed text-gray-400 hover:text-sky-500 hover:border-sky-500 hover:bg-sky-50/50 transition-colors">
                + Add Money Receipt
              </Button>
              
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  className="h-9 text-[11px] font-bold bg-white text-gray-400 border border-gray-200 hover:bg-gray-50 uppercase tracking-wider"
                  onClick={handleCreate}
                >
                  {initialInvoiceId ? "UPDATE" : "CREATE"}
                </Button>
                {!initialInvoiceId && (
                  <Button 
                    className="h-9 text-[11px] font-bold bg-white text-gray-400 border border-gray-200 hover:bg-gray-50 uppercase tracking-wider"
                    onClick={handleCreatePreview}
                  >
                    CREATE & PREVIEW
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
