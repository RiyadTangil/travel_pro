"use client"

import { useState } from "react"
import { useForm, FormProvider } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import axios from "axios"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { SharedModal } from "@/components/shared/shared-modal"

import { Step1InitialSelection } from "./modal-steps/step1-initial-selection"
import { Step2TicketInformation } from "./modal-steps/step2-ticket-information"
import { Step3ClientRefundInfo } from "./modal-steps/step3-client-refund-info"
import { Step4VendorRefundInfo } from "./modal-steps/step4-vendor-refund-info"

const moneyReturnSchema = z.object({
  paymentMethod: z.string().min(1, "Payment method is required"),
  accountId: z.string().min(1, "Account is required"),
  availableBalance: z.number().optional(),
})

const airticketRefundSchema = z.object({
  // Step 1
  clientId: z.string().min(1, "Client is required"),
  invoiceId: z.string().min(1, "Invoice is required"),
  ticketIds: z.array(z.string()).min(1, "At least one ticket must be selected"),
  refundDate: z.date({ required_error: "Refund date is required" }),
  note: z.string().optional(),

  // Step 2
  tickets: z.array(z.any()).optional(),

  // Step 3
  clientRefundType: z.enum(["BALANCE_ADJUSTMENT", "MONEY_RETURN"]).default("BALANCE_ADJUSTMENT"),
  clientReturnAmount: z.number().default(0),
  clientRefundDate: z.date().optional(),
  clientNote: z.string().optional(),
  clientMoneyReturn: moneyReturnSchema.optional(),

  // Step 4
  vendorRefundType: z.enum(["BALANCE_ADJUSTMENT", "MONEY_RETURN"]).default("BALANCE_ADJUSTMENT"),
  vendorReturnAmount: z.number().default(0),
  vendorDate: z.date().default(() => new Date()),
  vendorNote: z.string().optional(),
  vendorMoneyReturn: moneyReturnSchema.optional(),
}).superRefine((data, ctx) => {
  if (data.clientRefundType === "MONEY_RETURN" && !data.clientMoneyReturn) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Money return details are required for client",
      path: ["clientMoneyReturn"],
    })
  }
  if (data.vendorRefundType === "MONEY_RETURN" && !data.vendorMoneyReturn) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Money return details are required for vendor",
      path: ["vendorMoneyReturn"],
    })
  }

  // Refund profit validation
  if (data.tickets && data.tickets.length > 0) {
    data.tickets.forEach((t: any, index: number) => {
      const clientCharge = Number(t.refundChargeFromClient) || 0
      const vendorCharge = Number(t.refundChargeTakenByVendor) || 0
      const vendorRefund = Number(t.purchasePrice) || 0
      const sellPrice = Number(t.sellPrice) || 0

      if (clientCharge > sellPrice) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Client charge (${clientCharge}) cannot exceed sell price (${sellPrice})`,
          path: ["tickets", index, "refundChargeFromClient"],
        })
      }
      if (vendorCharge > vendorRefund) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Vendor charge (${vendorCharge}) cannot exceed vendor total refund (${vendorRefund})`,
          path: ["tickets", index, "refundChargeTakenByVendor"],
        })
      }
      if (vendorCharge > clientCharge) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Vendor charge (${vendorCharge}) cannot exceed client charge (${clientCharge})`,
          path: ["tickets", index, "refundChargeTakenByVendor"],
        })
      }
    })
  }
})

interface AirticketRefundModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function AirticketRefundModal({ isOpen, onClose, onSuccess }: AirticketRefundModalProps) {
  const { data: session } = useSession()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  const methods = useForm({
    resolver: zodResolver(airticketRefundSchema),
    mode: "onChange",
    defaultValues: {
      clientId: "",
      invoiceId: "",
      ticketIds: [],
      refundDate: new Date(),
      note: "",
      tickets: [],
      clientRefundType: "BALANCE_ADJUSTMENT",
      clientReturnAmount: 0,
      clientRefundDate: new Date(),
      clientNote: "",
      vendorRefundType: "BALANCE_ADJUSTMENT",
      vendorReturnAmount: 0,
      vendorDate: new Date(),
      vendorNote: "",
    }
  })

  const { reset, trigger, formState: { errors } } = methods

  const nextStep = async () => {
    let fieldsToValidate: any[] = []
    if (step === 1) {
      fieldsToValidate = ["clientId", "invoiceId", "ticketIds", "refundDate"]
    } else if (step === 2) {
      fieldsToValidate = ["tickets"]
    } else if (step === 3) {
      fieldsToValidate = ["clientRefundType", "clientReturnAmount"]
      const clientRefundType = methods.getValues("clientRefundType")
      if (clientRefundType === "MONEY_RETURN") {
        fieldsToValidate.push("clientMoneyReturn")
      }
    }

    const isValid = await trigger(fieldsToValidate)
    if (isValid) {
      setStep(prev => prev + 1)
    } else {
      toast.error("Please fix the errors before proceeding.")
      console.log("Validation errors:", errors)
    }
  }
  const prevStep = () => setStep(prev => prev - 1)

  const onStep1Submit = () => {
    nextStep()
  }

  const onFinalSubmit = async (data: any) => {
    if (!session?.user?.companyId) {
      toast.error("Session expired. Please login again.")
      return
    }

    setLoading(true)
    try {
      const tickets = data.tickets || []
      const clientTotalRefund = tickets.reduce((sum: number, t: any) => sum + (t.sellPrice || 0), 0)
      const clientTotalCharge = tickets.reduce((sum: number, t: any) => sum + (t.refundChargeFromClient || 0), 0)
      
      const vendorTotalRefund = tickets.reduce((sum: number, t: any) => sum + (t.purchasePrice || 0), 0)
      const vendorTotalCharge = tickets.reduce((sum: number, t: any) => sum + (t.refundChargeTakenByVendor || 0), 0)

      const refundProfit = clientTotalCharge - vendorTotalCharge

      const payload = {
        invoiceId: data.invoiceId,
        clientId: data.clientId,
        vendorId: data.tickets?.[0]?.vendorId || data.vendorId,
        refundDate: data.refundDate?.toISOString().slice(0, 10),
        note: data.note,
        
        // Client side
        clientRefundType: data.clientRefundType,
        clientReturnAmount: data.clientReturnAmount,
        clientAccountId: data.clientMoneyReturn?.accountId,
        clientPaymentMethod: data.clientMoneyReturn?.paymentMethod,
        clientTotalRefund,
        clientTotalCharge,

        // Vendor side
        vendorRefundType: data.vendorRefundType,
        vendorReturnAmount: data.vendorReturnAmount,
        vendorAccountId: data.vendorMoneyReturn?.accountId,
        vendorPaymentMethod: data.vendorMoneyReturn?.paymentMethod,
        vendorTotalRefund,
        vendorTotalCharge,

        refundProfit,

        // Tickets
        items: tickets.map((t: any) => ({
          ticketId: t.id,
          ticketNo: t.ticketNo,
          paxName: t.paxName,
          pnr: t.pnr,
          gdsPnr: t.gdsPnr,
          airline: t.airline,
          route: t.route,
          journeyDate: t.journeyDate,
          returnDate: t.returnDate,
          ticketType: t.ticketType,
          airbusClass: t.airbusClass,
          sellPrice: t.sellPrice,
          purchasePrice: t.purchasePrice,
          refundChargeFromClient: t.refundChargeFromClient || 0,
          refundChargeTakenByVendor: t.refundChargeTakenByVendor || 0,
          clientReturnAmount: t.sellPrice - (t.refundChargeFromClient || 0),
          vendorReturnAmount: t.purchasePrice - (t.refundChargeTakenByVendor || 0),
        }))
      }

      const response = await axios.post("/api/refund/airticket", payload, {
        headers: {
          "companyid": session.user.companyId
        }
      })

      if (response.data.ok) {
        toast.success("Airticket refund created successfully")
        onSuccess()
        onClose()
        setStep(1)
        reset()
      } else {
        toast.error(response.data.error || "Failed to create refund")
      }
    } catch (error: any) {
      console.error("Refund submission error:", error)
      const msg = error.response?.data?.error || error.message || "Internal Server Error"
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    onClose()
    setStep(1)
    reset()
  }

  return (
    <SharedModal
      open={isOpen}
      onOpenChange={handleClose}
      title="Add AirTicket Refund"
      maxWidth="max-w-[1200px]"
    >
      <div className="flex flex-col">
        <div className="flex-1 overflow-y-auto p-1">
          <FormProvider {...methods}>
            {step === 1 && <Step1InitialSelection onNext={onStep1Submit} />}
            {step === 2 && <Step2TicketInformation onNext={nextStep} />}
            {step === 3 && <Step3ClientRefundInfo onNext={nextStep} />}
            {step === 4 && <Step4VendorRefundInfo onFinalSubmit={onFinalSubmit} loading={loading} />}
          </FormProvider>
        </div>

        {step > 1 && (
          <div className="mt-6 pt-4 border-t flex items-center justify-between bg-white rounded-b-lg">
            <Button variant="outline" onClick={prevStep} disabled={loading} className="px-8">
              Previous
            </Button>
            
            {step === 4 && (
              <Button
                onClick={methods.handleSubmit(onFinalSubmit)}
                className="bg-[#00AEEF] hover:bg-[#008ECC] px-8"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm
              </Button>
            )}
          </div>
        )}
      </div>
    </SharedModal>
  )
}
