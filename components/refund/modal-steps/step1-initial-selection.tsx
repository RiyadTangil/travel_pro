"use client"

import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { DateInput } from "@/components/ui/date-input"
import axios from "axios"
import { useSession } from "next-auth/react"

import { Select as AntSelect } from "antd"
import { Controller, useFormContext } from "react-hook-form"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import ClientSelect from "@/components/clients/client-select"

interface Step1InitialSelectionProps {
  onNext: (data: any) => void
}

export function Step1InitialSelection({ onNext }: Step1InitialSelectionProps) {
  const { data: session } = useSession()
  const { control, handleSubmit, watch, setValue, formState: { errors } } = useFormContext()
  const [invoices, setInvoices] = useState<any[]>([])
  const [tickets, setTickets] = useState<any[]>([])
  const [invoiceData, setInvoiceData] = useState<any>(null)
  const [vendors, setVendors] = useState<any[]>([])
  const [loadingInvoices, setLoadingInvoices] = useState(false)
  const [loadingTickets, setLoadingTickets] = useState(false)

  const clientId = watch("clientId")
  const invoiceId = watch("invoiceId")

  useEffect(() => {
    if (clientId && session?.user?.companyId) {
      const fetchInvoices = async () => {
        setLoadingInvoices(true)
        try {
          const res = await axios.get(`/api/invoices?clientId=${clientId}&isRefund=false&pageSize=100`, {
            headers: { "x-company-id": session.user.companyId }
          })
          setInvoices(res.data?.items || [])
        } catch (err) {
          console.error("Error fetching invoices:", err)
        } finally {
          setLoadingInvoices(false)
        }
      }
      fetchInvoices()
    } else {
      setInvoices([])
    }
    // Clear invoice and tickets when client changes
    setValue("invoiceId", "")
    setValue("ticketIds", [])
    setInvoiceData(null)
    setVendors([])
  }, [clientId, session?.user?.companyId, setValue])

  useEffect(() => {
    if (invoiceId && session?.user?.companyId) {
      const fetchInvoiceDetails = async () => {
        setLoadingTickets(true)
        try {
          const res = await axios.get(`/api/invoices/${invoiceId}`, {
            headers: { "x-company-id": session.user.companyId }
          })
          // The response from /api/invoices/[id] contains a 'data' field from the controller ok() wrapper
          const fullData = res.data?.data || res.data
          const inv = fullData.invoice || fullData
          setInvoiceData(inv)
          const allTickets = inv.tickets || []
          // Filter out refunded tickets
          setTickets(allTickets.filter((t: any) => !t.isRefund))
          setVendors(fullData.vendors || [])
        } catch (err) {
          console.error("Error fetching invoice details:", err)
        } finally {
          setLoadingTickets(false)
        }
      }
      fetchInvoiceDetails()
    } else {
      setTickets([])
      setInvoiceData(null)
      setVendors([])
    }
    setValue("ticketIds", [])
  }, [invoiceId, session?.user?.companyId, setValue])

  const handleNextInternal = (data: any) => {
    // Populate the full ticket objects for Step 2
    const selectedTicketIds = data.ticketIds || []
    const items = invoiceData?.billing?.items || invoiceData?.items || []

    const selectedTickets = selectedTicketIds.map((tid: string) => {
      // Find the ticket info from InvoiceTicket array
      const t = tickets.find(t => String(t._id || t.id) === tid)
      
      // Find the financial info from InvoiceItem array
      const item = items.find((ii: any) => 
        String(ii.referenceId || ii.ticketId || ii.id || ii._id) === tid
      )

      const vendor = vendors.find(v => String(v.id || v._id) === String(item?.vendorId || ""))

      return {
        id: tid,
        ticketNo: t?.ticketNo || item?.ticketMetadata?.ticketNo || "N/A",
        paxName: item?.paxName || t?.paxName || "N/A",
        pnr: t?.pnr || item?.ticketMetadata?.pnr || "N/A",
        gdsPnr: t?.gdsPnr || item?.ticketMetadata?.gdsPnr || "",
        profit: item?.profit || 0,
        sellPrice: item?.unitPrice || item?.totalSales || 0,
        purchasePrice: item?.costPrice || item?.totalCost || 0,
        discount: item?.discount || 0,
        vendorName: vendor?.name || item?.vendorName || "N/A",
        vendorId: item?.vendorId || "",
        airline: t?.airline || item?.ticketMetadata?.airline || "N/A",
        route: t?.route || item?.ticketMetadata?.route || "N/A",
        journeyDate: t?.journeyDate || item?.ticketMetadata?.journeyDate || "",
        returnDate: t?.returnDate || item?.ticketMetadata?.returnDate || "",
        ticketType: t?.ticketType || item?.ticketMetadata?.ticketType || "",
        airbusClass: t?.airbusClass || item?.ticketMetadata?.airbusClass || "",
        refundChargeFromClient: 0,
        refundChargeTakenByVendor: 0,
      }
    })

    setValue("tickets", selectedTickets)
    onNext(data)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className={cn(errors.clientId && "text-red-500")}>
            <span className="text-red-500">*</span> Select Client
          </Label>
          <Controller
            name="clientId"
            control={control}
            render={({ field }) => (
              <ClientSelect
                value={field.value}
                onChange={field.onChange}
                className={cn(errors.clientId && "border-red-500")}
              />
            )}
          />
        </div>
        <div className="space-y-2">
          <Label className={cn(errors.invoiceId && "text-red-500")}>
            <span className="text-red-500">*</span> Select Invoice
          </Label>
          <Controller
            name="invoiceId"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value} disabled={loadingInvoices || !clientId}>
                <SelectTrigger className={cn(errors.invoiceId && "border-red-500")}>
                  <SelectValue placeholder={loadingInvoices ? "Loading..." : "Select Invoice"} />
                </SelectTrigger>
                <SelectContent>
                  {invoices.map((inv) => (
                    <SelectItem key={inv.id} value={inv.id}>
                      {inv.invoiceNo} ({inv.salesDate})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className={cn(errors.ticketIds && "text-red-500")}>
            <span className="text-red-500">*</span> Select Ticket No.
          </Label>
          <Controller
            name="ticketIds"
            control={control}
            render={({ field: { value, onChange, onBlur, name, ref } }) => (
              <AntSelect
                name={name}
                ref={ref}
                onBlur={onBlur}
                mode="multiple"
                className="w-full"
                placeholder={loadingTickets ? "Loading..." : "Select Ticket No."}
                loading={loadingTickets}
                disabled={!invoiceId}
                onChange={onChange}
                value={value || []}
                options={tickets.map(t => {
                  const item = (invoiceData?.billing?.items || invoiceData?.items || []).find((ii: any) => 
                    String(ii.referenceId || ii.ticketId || ii.id || ii._id) === String(t._id || t.id)
                  );
                  return {
                    label: `${t.ticketNo} - ${item?.paxName || t.paxName || "Unknown Pax"}`,
                    value: String(t._id || t.id)
                  };
                })}
                status={errors.ticketIds ? "error" : undefined}
                getPopupContainer={(trigger) => trigger.parentElement}
                allowClear
              />
            )}
          />
        </div>
        <div className="space-y-2">
          <Label>Refund Date</Label>
          <Controller
            name="refundDate"
            control={control}
            render={({ field }) => (
              <DateInput value={field.value} onChange={field.onChange} />
            )}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Note</Label>
        <Controller
          name="note"
          control={control}
          render={({ field }) => (
            <Textarea {...field} placeholder="Note something" className="min-h-[100px]" />
          )}
        />
      </div>

      <div className="flex justify-start">
        <Button onClick={handleSubmit(handleNextInternal)} className="bg-[#00AEEF] hover:bg-[#008ECC]">
          Next
        </Button>
      </div>
    </div>
  )
}
