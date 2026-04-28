"use client"

import { useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { DateInput } from "@/components/ui/date-input"
import { Controller, useFormContext } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"
import { MoneyReturnFields } from "./money-return-fields"

interface Step4VendorRefundInfoProps {
  onFinalSubmit: (data: any) => void
  loading: boolean
}

export function Step4VendorRefundInfo({ onFinalSubmit, loading }: Step4VendorRefundInfoProps) {
  const { control, handleSubmit, watch, setValue, formState: { errors } } = useFormContext()
  const refundType = watch("vendorRefundType")
  const tickets = watch("tickets") || []

  // Calculate vendor totals
  const totalRefund = tickets.reduce((sum: number, t: any) => sum + (t.purchasePrice || 0), 0)
  const totalCharge = tickets.reduce((sum: number, t: any) => sum + (t.refundChargeTakenByVendor || 0), 0)
  const returnAmount = totalRefund - totalCharge

  // Update form value for return amount
  useEffect(() => {
    setValue("vendorReturnAmount", returnAmount)
  }, [returnAmount, setValue])

  return (
    <div className="space-y-6">
      <div className="border-b pb-2 pt-4">
        <h3 className="text-sm font-semibold text-gray-700">Vendor Refund Information:</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] border rounded-md divide-y overflow-hidden">
        <div className="p-3 bg-gray-50 text-sm font-medium">Vendor Name</div>
        <div className="p-3 text-sm">{tickets[0]?.vendorName || "N/A"}</div>

        <div className="p-3 bg-gray-50 text-sm font-medium">Total Refund</div>
        <div className="p-3 text-sm font-semibold">{totalRefund.toLocaleString()}</div>

        <div className="p-3 bg-gray-50 text-sm font-medium">Refund Charge</div>
        <div className="p-3 text-sm text-red-500 font-semibold">{totalCharge.toLocaleString()}</div>

        <div className="p-3 bg-gray-50 text-sm font-medium">Return Amount</div>
        <div className="p-3 text-sm text-green-600 font-bold">{returnAmount.toLocaleString()}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label><span className="text-red-500">*</span> Vendor Refund Type</Label>
          <Controller
            name="vendorRefundType"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger className={cn(errors.vendorRefundType && "border-red-500")}>
                  <SelectValue placeholder="Select Refund Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BALANCE_ADJUSTMENT">Balance Adjustment</SelectItem>
                  <SelectItem value="MONEY_RETURN">Money Return</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-2">
          <Label>Vendor Return Amount</Label>
          <Controller
            name="vendorReturnAmount"
            control={control}
            render={({ field }) => (
              <Input
                type="number"
                {...field}
                readOnly
                className="bg-gray-100 cursor-not-allowed"
                onChange={e => field.onChange(Number(e.target.value))}
              />
            )}
          />
        </div>
      </div>

      {refundType === "MONEY_RETURN" && (
        <MoneyReturnFields type="vendor" errors={errors} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label><span className="text-red-500">*</span> Date</Label>
          <Controller
            name="vendorDate"
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
          name="vendorNote"
          control={control}
          render={({ field }) => (
            <Textarea {...field} placeholder="Note" className="min-h-[80px]" />
          )}
        />
      </div>
    </div>
  )
}
