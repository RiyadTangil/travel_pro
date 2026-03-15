"use client"

import { useState, useCallback, useMemo, useEffect, memo } from "react"
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

export function AddNonCommissionModal({ 
  isOpen, 
  onClose, 
  onInvoiceAdded, 
  initialInvoiceId 
}: AddNonCommissionModalProps) {
  // --- General State ---
  const [clientId, setClientId] = useState<string | undefined>()
  const [employeeId, setEmployeeId] = useState<string | undefined>()
  const [agentId, setAgentId] = useState<string | undefined>()
  const [invoiceNo, setInvoiceNo] = useState("")
  const [salesDate, setSalesDate] = useState<Date | undefined>(new Date())
  const [dueDate, setDueDate] = useState<Date | undefined>()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(false)

  // List of added items (for the right summary table)
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [resetKey, setResetKey] = useState(0)

  // Billing state
  const [billing, setBilling] = useState({
    subtotal: 0,
    discount: 0,
    serviceCharge: 0,
    vatTax: 0,
    netTotal: 0,
    agentCommission: 0,
    reference: "",
    note: "",
    showPrevDue: "No",
    showDiscount: "No"
  })

  // --- API Data Hooks ---
  const [airlineOptions, setAirlineOptions] = useState<string[]>([])
  const [airportList, setAirportList] = useState<any[]>([])

  useEffect(() => {
    if (!isOpen) return
    const fetchLookups = async () => {
      try {
        const [airRes, portRes] = await Promise.all([
          fetch('/api/airlines?limit=500'),
          fetch('/api/airports?limit=500')
        ])
        const [airData, portData] = await Promise.all([airRes.json(), portRes.json()])
        setAirlineOptions((airData.items || []).map((a: any) => a.name))
        setAirportList(portData.items || [])
      } catch (e) {
        console.error("Failed to fetch lookups", e)
      }
    }
    fetchLookups()
  }, [isOpen])

  // Fetch invoice if in Edit mode
  useEffect(() => {
    if (initialInvoiceId && isOpen) {
      const fetchInvoice = async () => {
        setLoading(true)
        try {
          const res = await fetch(`/api/invoices/non-commission/${initialInvoiceId}`)
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || "Failed to fetch invoice")

          // Populate states
          setClientId(data.clientId)
          setEmployeeId(data.employeeId)
          setAgentId(data.agentId)
          setInvoiceNo(data.invoiceNo)
          setSalesDate(data.salesDate ? new Date(data.salesDate) : new Date())
          setDueDate(data.dueDate ? new Date(data.dueDate) : undefined)
          setItems(data.items || [])
          setBilling({
            subtotal: data.billing?.subtotal || 0,
            discount: data.billing?.discount || 0,
            serviceCharge: data.billing?.serviceCharge || 0,
            vatTax: data.billing?.vatTax || 0,
            netTotal: data.billing?.netTotal || 0,
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
    } else if (isOpen) {
      // Reset for New mode
      setClientId(undefined)
      setEmployeeId(undefined)
      setAgentId(undefined)
      setInvoiceNo("")
      setSalesDate(new Date())
      setDueDate(undefined)
      setItems([])
      setBilling({
        subtotal: 0,
        discount: 0,
        serviceCharge: 0,
        vatTax: 0,
        netTotal: 0,
        agentCommission: 0,
        note: "",
        reference: "",
        showPrevDue: "No",
        showDiscount: "No"
      })
      
      // Fetch next invoice number
      const fetchNextNo = async () => {
        try {
          const res = await fetch('/api/invoices/next-no')
          const data = await res.json()
          if (data.nextInvoiceNo) {
            const numPart = data.nextInvoiceNo.match(/\d+$/)?.[0] || "0001"
            setInvoiceNo(`ANC-${numPart}`)
          }
        } catch (e) {}
      }
      fetchNextNo()
    }
  }, [initialInvoiceId, isOpen, onClose])

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

  useEffect(() => {
    setBilling(prev => ({ ...prev, netTotal: calculatedNetTotal }))
  }, [calculatedNetTotal])

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
    paxEntries.forEach((p, i) => {
      if (!p.name) newErrors[`pax[${i}].name`] = "Name is required"
    })

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
    
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      ticketDetails: { ...ticketDetails },
      paxEntries: [...paxEntries],
      flightEntries: [...flightEntries],
      profit: currentProfit
    }

    setItems(prev => [...prev, newItem])
    
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
    // Move item data back to form and remove from list
    setTicketDetails(item.ticketDetails)
    setPaxEntries(item.paxEntries)
    setFlightEntries(item.flightEntries)
    setItems(prev => prev.filter(i => i.id !== item.id))
    // Trigger resetKey to re-mount with new initial data if needed, 
    // or we make them controlled. Let's force a resetKey change.
    setResetKey(prev => prev + 1)
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

  const validateGlobal = () => {
    const newErrors: Record<string, string> = {}
    if (!clientId) newErrors.clientId = "Client is required"
    if (!employeeId) newErrors.employeeId = "Sales By is required"
    if (!salesDate) newErrors.salesDate = "Sales Date is required"
    if (items.length === 0) {
      toast({ title: "Error", description: "Please add at least one item", variant: "destructive" })
      return false
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCreate = async () => {
    if (!validateGlobal()) return
    
    setSubmitting(true)
    try {
      const payload = {
        general: { clientId, employeeId, agentId, invoiceNo, salesDate, dueDate },
        items,
        billing,
      }
      
      const url = initialInvoiceId 
        ? `/api/invoices/non-commission/${initialInvoiceId}`
        : '/api/invoices/non-commission'
      
      const res = await fetch(url, {
        method: initialInvoiceId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save invoice')
      
      toast({ title: "Success", description: `Non-Commission Invoice ${initialInvoiceId ? 'updated' : 'created'} successfully` })
      onInvoiceAdded?.(data)
      onClose()
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreatePreview = async () => {
    if (!validateGlobal()) return
    
    // For preview, we could call a specific preview endpoint or just open a PDF
    // For now, let's just trigger the create logic as a placeholder
    handleCreate()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[98vw] w-[98vw] h-[95vh] max-h-[95vh] p-0 flex flex-col overflow-hidden bg-gray-50">
        <DialogHeader className="px-6 py-3 border-b bg-white flex flex-row items-center justify-between shrink-0">
          <DialogTitle className="text-lg font-bold text-gray-800">Add Non-Commission Invoice</DialogTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Main Scrollable Area for Forms */}
          <ScrollArea className="flex-[3] h-full border-r bg-gray-50/30">
            <div className="p-6 space-y-6">
              {/* General Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">Search Client <span className="text-red-500">*</span></Label>
                  <ClientSelect 
                    value={clientId} 
                    onChange={id => {
                      setClientId(id)
                      if (id) setErrors(prev => ({ ...prev, clientId: "" }))
                    }} 
                    placeholder="Search Client"
                    className={cn("h-9 text-xs", errors.clientId && "border-red-500")}
                  />
                  {errors.clientId && <p className="text-[10px] text-red-500 mt-0.5">{errors.clientId}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">Sales By <span className="text-red-500">*</span></Label>
                  <EmployeeSelect 
                    value={employeeId} 
                    onChange={id => {
                      setEmployeeId(id)
                      if (id) setErrors(prev => ({ ...prev, employeeId: "" }))
                    }} 
                    placeholder="Select employee"
                    className={cn("h-9 text-xs", errors.employeeId && "border-red-500")}
                  />
                  {errors.employeeId && <p className="text-[10px] text-red-500 mt-0.5">{errors.employeeId}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">Invoice No</Label>
                  <Input value={invoiceNo} readOnly className="h-9 text-xs bg-gray-100" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">Sales Date <span className="text-red-500">*</span></Label>
                  <DateInput 
                    value={salesDate} 
                    onChange={d => {
                      setSalesDate(d)
                      if (d) setErrors(prev => ({ ...prev, salesDate: "" }))
                    }} 
                    className={cn("h-9 text-xs", errors.salesDate && "border-red-500")} 
                  />
                  {errors.salesDate && <p className="text-[10px] text-red-500 mt-0.5">{errors.salesDate}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">Due Date</Label>
                  <DateInput value={dueDate} onChange={setDueDate} className="h-9 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">Select Agent</Label>
                  <AgentSelect 
                    value={agentId} 
                    onChange={setAgentId} 
                    placeholder="Select Agent"
                    className="h-9 text-xs"
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
              <div className="flex justify-end pt-4 pb-8">
                <Button 
                  onClick={handleAddNew}
                  className="bg-sky-400 hover:bg-sky-500 text-white rounded-md px-8 text-xs h-9 font-bold"
                >
                  Add New
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
                      <Label className="text-[11px] font-bold text-gray-500">Discount</Label>
                      <Input 
                        type="number" 
                        className="h-8 text-xs" 
                        value={billing.discount}
                        onChange={(e) => setBilling(prev => ({ ...prev, discount: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-gray-500">Service Charge</Label>
                      <Input 
                        type="number" 
                        className="h-8 text-xs" 
                        value={billing.serviceCharge}
                        onChange={(e) => setBilling(prev => ({ ...prev, serviceCharge: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-gray-500">Vat / Tax</Label>
                      <Input 
                        type="number" 
                        className="h-8 text-xs" 
                        value={billing.vatTax}
                        onChange={(e) => setBilling(prev => ({ ...prev, vatTax: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-gray-500">Net Total</Label>
                      <Input readOnly className="h-8 text-xs bg-gray-50 font-bold text-sky-600" value={billing.netTotal.toLocaleString()} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-gray-500">Commission</Label>
                      <Input 
                        type="number" 
                        className="h-8 text-xs" 
                        value={billing.agentCommission}
                        onChange={(e) => setBilling(prev => ({ ...prev, agentCommission: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-gray-500">Reference</Label>
                      <Input 
                        placeholder="Ref..."
                        className="h-8 text-xs" 
                        value={billing.reference} 
                        onChange={(e) => setBilling(prev => ({ ...prev, reference: e.target.value }))} 
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-gray-500">Note</Label>
                    <textarea 
                      className="w-full min-h-[60px] p-2 text-xs border rounded-md focus:outline-none focus:ring-1 focus:ring-sky-400 bg-gray-50/30" 
                      placeholder="Internal notes..."
                      value={billing.note}
                      onChange={(e) => setBilling(prev => ({ ...prev, note: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-3 pt-1">
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Show Prev Due?</span>
                      <RadioGroup value={billing.showPrevDue} onValueChange={v => setBilling(prev => ({...prev, showPrevDue: v}))} className="flex gap-4">
                        <div className="flex items-center space-x-1.5">
                          <RadioGroupItem value="Yes" id="prev-yes" className="h-3 w-3" />
                          <Label htmlFor="prev-yes" className="text-[10px] font-medium">Yes</Label>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <RadioGroupItem value="No" id="prev-no" className="h-3 w-3" />
                          <Label htmlFor="prev-no" className="text-[10px] font-medium">No</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Show Discount?</span>
                      <RadioGroup value={billing.showDiscount} onValueChange={v => setBilling(prev => ({...prev, showDiscount: v}))} className="flex gap-4">
                        <div className="flex items-center space-x-1.5">
                          <RadioGroupItem value="Yes" id="disc-yes" className="h-3 w-3" />
                          <Label htmlFor="disc-yes" className="text-[10px] font-medium">Yes</Label>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <RadioGroupItem value="No" id="disc-no" className="h-3 w-3" />
                          <Label htmlFor="disc-no" className="text-[10px] font-medium">No</Label>
                        </div>
                      </RadioGroup>
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
                  CREATE
                </Button>
                <Button 
                  className="h-9 text-[11px] font-bold bg-white text-gray-400 border border-gray-200 hover:bg-gray-50 uppercase tracking-wider"
                  onClick={handleCreatePreview}
                >
                  CREATE & PREVIEW
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
