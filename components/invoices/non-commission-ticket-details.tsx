"use client"

import { useState, useCallback, useEffect, memo, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Ticket } from "lucide-react"
import { DateInput } from "@/components/ui/date-input"
import { CustomDropdown } from "./custom-dropdown"
import VendorSelect from "@/components/vendors/vendor-select"
import { cn } from "@/lib/utils"
import AirportRouteSelect from "./airport-route-select"

const airbusClassOptions = ["Economy","Premium Economy", "Business", "First"]

export interface TicketDetailsData {
  ticketNo: string
  clientPrice: number
  purchasePrice: number
  extraFee: number
  vendor: string
  airline: string
  ticketType: string
  route: string
  pnr: string
  gdsPnr: string
  paxName: string
  issueDate: Date
  journeyDate?: Date
  returnDate?: Date
  airbusClass: string
}

interface NonCommissionTicketDetailsProps {
  initialData?: TicketDetailsData
  onChange: (data: TicketDetailsData) => void
  airlineOptions: string[]
  airportList: any[]
  errors: Record<string, string>
}

export const NonCommissionTicketDetails = memo(function NonCommissionTicketDetails({ 
  initialData, 
  onChange,
  airlineOptions,
  airportList,
  errors
}: NonCommissionTicketDetailsProps) {
  const [data, setData] = useState<TicketDetailsData>(initialData || {
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

  const profit = useMemo(() => {
    return (data.clientPrice || 0) - (data.purchasePrice || 0) + (data.extraFee || 0)
  }, [data.clientPrice, data.purchasePrice, data.extraFee])

  const updateField = useCallback((field: keyof TicketDetailsData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }))
  }, [])

  useEffect(() => {
    onChange(data)
  }, [data, onChange])

  return (
    <Card className="border-none shadow-sm rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-100/80 flex items-center gap-2 border-b">
        <Ticket className="h-4 w-4 text-pink-500" />
        <span className="text-sm font-bold text-gray-700 uppercase tracking-tight">Ticket Details</span>
      </div>
      <CardContent className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-4">
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-gray-500">Ticket No <span className="text-red-500">*</span></Label>
            <Input 
              placeholder="Ticket No" 
              className={cn("h-8 text-xs", errors.ticketNo && "border-red-500")} 
              value={data.ticketNo}
              onChange={e => {
                updateField('ticketNo', e.target.value)
                if (e.target.value) errors.ticketNo = ""
              }}
            />
            {errors.ticketNo && <p className="text-[10px] text-red-500 mt-0.5">{errors.ticketNo}</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-gray-500">Client Price <span className="text-red-500">*</span></Label>
            <Input 
              type="number" 
              placeholder="0" 
              className={cn("h-8 text-xs", errors.clientPrice && "border-red-500")}
              value={data.clientPrice}
              onChange={e => {
                updateField('clientPrice', Number(e.target.value))
                if (e.target.value) errors.clientPrice = ""
              }}
            />
            {errors.clientPrice && <p className="text-[10px] text-red-500 mt-0.5">{errors.clientPrice}</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-gray-500">Purchase Price <span className="text-red-500">*</span></Label>
            <Input 
              type="number" 
              placeholder="0" 
              className={cn("h-8 text-xs", errors.purchasePrice && "border-red-500")}
              value={data.purchasePrice}
              onChange={e => {
                updateField('purchasePrice', Number(e.target.value))
                if (e.target.value) errors.purchasePrice = ""
              }}
            />
            {errors.purchasePrice && <p className="text-[10px] text-red-500 mt-0.5">{errors.purchasePrice}</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-gray-500">Vendor <span className="text-red-500">*</span></Label>
            <VendorSelect 
              value={data.vendor}
              onChange={id => {
                updateField('vendor', id || "")
                if (id) errors.vendor = ""
              }}
              placeholder="Select Vendor" 
              className={cn("h-8 text-xs", errors.vendor && "border-red-500")} 
            />
            {errors.vendor && <p className="text-[10px] text-red-500 mt-0.5">{errors.vendor}</p>}
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-gray-500">Airline <span className="text-red-500">*</span></Label>
            <CustomDropdown 
              placeholder="Select airline" 
              options={airlineOptions} 
              value={data.airline}
              onValueChange={v => {
                updateField('airline', v)
                if (v) errors.airline = ""
              }}
              className={cn("h-8 text-xs", errors.airline && "border-red-500")} 
            />
            {errors.airline && <p className="text-[10px] text-red-500 mt-0.5">{errors.airline}</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-gray-500">Extra Fee</Label>
            <Input 
              type="number" 
              placeholder="0" 
              className="h-8 text-xs" 
              value={data.extraFee}
              onChange={e => updateField('extraFee', Number(e.target.value))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-gray-500">Ticket Type</Label>
            <CustomDropdown 
              placeholder="Ticket Type" 
              options={["One Way", "Return"]} 
              value={data.ticketType}
              onValueChange={v => updateField('ticketType', v)}
              className="h-8 text-xs" 
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-gray-500">Route/Sector</Label>
            <AirportRouteSelect
              value={data.route}
              onChange={v => updateField('route', v)}
              placeholder="DAC->DXB->DAC"
              preloaded={airportList}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-gray-500">PNR</Label>
            <Input 
              placeholder="PNR" 
              className="h-8 text-xs"
              value={data.pnr}
              onChange={e => updateField('pnr', e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-gray-500">GDS PNR</Label>
            <Input 
              placeholder="GDS PNR" 
              className="h-8 text-xs"
              value={data.gdsPnr}
              onChange={e => updateField('gdsPnr', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-gray-500">Pax Name <span className="text-red-500">*</span></Label>
            <Input 
              placeholder="Pax Name" 
              className={cn("h-8 text-xs", errors.paxName && "border-red-500")}
              value={data.paxName}
              onChange={e => {
                updateField('paxName', e.target.value)
                if (e.target.value) errors.paxName = ""
              }}
            />
            {errors.paxName && <p className="text-[10px] text-red-500 mt-0.5">{errors.paxName}</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-gray-500">Issue Date <span className="text-red-500">*</span></Label>
            <DateInput 
              value={data.issueDate} 
              placeholder="Select date" 
              onChange={d => updateField('issueDate', d )}
              className="h-8 text-xs" 
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-gray-500">Journcey Date</Label>
            <DateInput 
              value={data.journeyDate} 
              onChange={d => updateField('journeyDate', d)}
              placeholder="Select date" 
              className="h-8 text-xs" 
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-gray-500">Return Date</Label>
            <DateInput 
              value={data.returnDate} 
              onChange={d => updateField('returnDate', d)}
              placeholder="Select date" 
              className="h-8 text-xs" 
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-gray-500">Airbus class</Label>
            <CustomDropdown 
              placeholder="Select class" 
              options={airbusClassOptions} 
              value={data.airbusClass}
              onValueChange={v => updateField('airbusClass', v)}
              className="h-8 text-xs" 
            />
          </div>
          
          <div className="md:col-span-2 grid grid-cols-3 gap-2 bg-blue-50/40 p-3 rounded-lg border border-blue-100/50 self-end">
            <div className="flex flex-col">
              <span className="text-[9px] text-gray-400 font-bold uppercase">Client Price</span>
              <span className="text-sm font-bold text-gray-700">{data.clientPrice.toLocaleString()}</span>
            </div>
            <div className="flex flex-col border-x px-3 border-blue-100">
              <span className="text-[9px] text-gray-400 font-bold uppercase">Purchase Price</span>
              <span className="text-sm font-bold text-gray-700">{data.purchasePrice.toLocaleString()}</span>
            </div>
            <div className="flex flex-col pl-2">
              <span className="text-[9px] text-gray-400 font-bold uppercase">Profit</span>
              <span className={cn("text-sm font-bold", profit >= 0 ? "text-green-600" : "text-red-600")}>
                {profit.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
