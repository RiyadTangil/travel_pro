"use client"

import { useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { DateInput } from "@/components/ui/date-input"
import { Controller, useFormContext } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { MoneyReturnFields } from "./money-return-fields"

interface Step3ClientRefundInfoProps {
  onNext: (data: any) => void
}

export function Step3ClientRefundInfo({ onNext }: Step3ClientRefundInfoProps) {
  const { control, handleSubmit, watch, setValue, formState: { errors } } = useFormContext()
  const refundType = watch("clientRefundType")
  const tickets = watch("tickets") || []
  
  // Calculate client totals
  const totalRefund = tickets.reduce((sum: number, t: any) => sum + (t.sellPrice || 0), 0)
  const totalCharge = tickets.reduce((sum: number, t: any) => sum + (t.refundChargeFromClient || 0), 0)
  const returnAmount = totalRefund - totalCharge

  // Update form value for return amount
  useEffect(() => {
    setValue("clientReturnAmount", returnAmount)
  }, [returnAmount, setValue])

  return (
    <div className="space-y-6">
      <div className="border-b pb-2">
        <h3 className="text-sm font-semibold text-gray-700">Client Refund Information :</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] border rounded-md divide-y overflow-hidden">
        <div className="p-3 bg-gray-50 text-sm font-medium">Client Name</div>
        {/* <div className="p-3 text-sm">test riyad</div> */}
        <div className="p-3 text-sm">N/A</div>

        <div className="p-3 bg-gray-50 text-sm font-medium">Total Refund</div>
        <div className="p-3 text-sm">10</div>

        <div className="p-3 bg-gray-50 text-sm font-medium">Total Refund Charge</div>
        <div className="p-3 text-sm text-red-500 font-semibold">{totalCharge.toLocaleString()}</div>

        <div className="p-3 bg-gray-50 text-sm font-medium">Total Return Amount</div>
        <div className="p-3 text-sm text-green-600 font-bold">{returnAmount.toLocaleString()}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label><span className="text-red-500">*</span> Client Refund Type</Label>
          <Controller
            name="clientRefundType"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue />
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
          <Label>    {refundType === "MONEY_RETURN" ? "Return Amount" : "Advance  Amount"}</Label>
          <Controller
            name="clientReturnAmount"
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

        {refundType === "MONEY_RETURN" && (
          <>
            <div className="space-y-2">
              <Label>Date</Label>
              <Controller
                name="clientRefundDate"
                control={control}
                render={({ field }) => (
                  <DateInput value={field.value} onChange={field.onChange} />
                )}
              />
            </div>
            <div className="space-y-2 ">
              <Label>Note</Label>
              <Controller
                name="clientNote"
                control={control}
                render={({ field }) => (
                  <Textarea {...field} placeholder="Client refund note" className="min-h-[40px]" />
                )}
              />
            </div>
          </>

        )}
      </div>

      {refundType === "MONEY_RETURN" && (
        <MoneyReturnFields type="client" errors={errors} />
      )}

      <div className="flex justify-end">
        <Button onClick={onNext} className="bg-[#00AEEF] hover:bg-[#008ECC]">
          Check And Confirm To Vendor Payment
        </Button>
      </div>
    </div>
  )
}
