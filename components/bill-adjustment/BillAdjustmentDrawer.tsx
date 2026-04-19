"use client"

import { useForm, Controller } from "react-hook-form"
import { Drawer, Button as AntButton, Select as AntSelect, Input as AntInput, DatePicker } from "antd"
import { useEffect, useState } from "react"
import ClientSelect from "@/components/clients/client-select"
import VendorSelect from "@/components/vendors/vendor-select"
import dayjs from "dayjs"

export type BillAdjustmentType = "Account" | "Client" | "Vendor" | "Combined"

interface FormValues {
  type: BillAdjustmentType
  paymentMethod?: string
  accountId?: string
  paymentType?: string
  amount: string
  date: string
  note?: string
  clientId?: string
  vendorId?: string
  combinedId?: string
  name?: string
  transactionType?: string
}

interface BillAdjustmentDrawerProps {
  open: boolean
  onClose: () => void
  type: BillAdjustmentType
  onSubmit: (values: any) => Promise<boolean>
}

export default function BillAdjustmentDrawer({ open, onClose, type, onSubmit }: BillAdjustmentDrawerProps) {
  const { control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      type,
      amount: "",
      date: dayjs().format("YYYY-MM-DD"),
      note: "",
      transactionType: "DEBIT"
    }
  })

  const [accounts, setAccounts] = useState<any[]>([])
  const [paymentMethods, setPaymentMethods] = useState<string[]>(["Cash", "Bank", "Mobile banking", "Credit Card"])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      reset({
        type,
        amount: "",
        date: dayjs().format("YYYY-MM-DD"),
        note: "",
        transactionType: "DEBIT"
      })
      
      // Fetch accounts
      fetch("/api/accounts?page=1&pageSize=100")
        .then(res => res.json())
        .then(data => {
          setAccounts(data.items || [])
        })
        .catch(() => {})
    }
  }, [open, type, reset])

  const onFinish = async (data: FormValues) => {
    setSubmitting(true)
    try {
      let finalName = ""
      if (type === "Account") {
        const acc = accounts.find(a => a.id === data.accountId)
        finalName = acc ? (acc.bankName ? `${acc.name} (${acc.bankName})` : acc.name) : ""
      } else if (type === "Client") {
        // name is set via ClientSelect onChange below
        finalName = data.name || ""
      } else if (type === "Vendor") {
        // name is set via VendorSelect onChange below
        finalName = data.name || ""
      } else if (type === "Combined") {
        finalName = data.name || ""
      }

      const ok = await onSubmit({ ...data, name: finalName, transactionType: data.transactionType || "DEBIT" })
      if (ok) {
        onClose()
      }
    } finally {
      setSubmitting(false)
    }
  }

  const title = `Add ${type}s Bill Adjustment`
  const submitText = `Add ${type} Bill Adjustment`

  return (
    <Drawer
      title={title}
      placement="right"
      onClose={onClose}
      open={open}
      width={600}
      extra={
        <AntButton onClick={onClose}>Cancel</AntButton>
      }
    >
      <form onSubmit={handleSubmit(onFinish)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Row 1 */}
          {type === "Account" && (
            <>
              <div className="space-y-1">
                <label className="text-sm font-medium">Payment Method</label>
                <Controller
                  name="paymentMethod"
                  control={control}
                  render={({ field }) => (
                    <AntSelect
                      {...field}
                      className="w-full"
                      placeholder="Select Payment Method"
                      options={paymentMethods.map(m => ({ label: m, value: m }))}
                    />
                  )}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium"><span className="text-red-500">*</span> Account</label>
                <Controller
                  name="accountId"
                  control={control}
                  rules={{ required: "Account is required" }}
                  render={({ field }) => (
                    <AntSelect
                      {...field}
                      className="w-full"
                      status={errors.accountId ? "error" : ""}
                      placeholder="Select Account"
                      options={accounts.map(a => ({ label: a.bankName ? `${a.name} (${a.bankName})` : a.name, value: a.id }))}
                    />
                  )}
                />
                {errors.accountId && <p className="text-xs text-red-500">{errors.accountId.message}</p>}
              </div>
            </>
          )}

          {type === "Client" && (
            <div className="col-span-1 space-y-1">
              <label className="text-sm font-medium"><span className="text-red-500">*</span> Client</label>
              <Controller
                name="clientId"
                control={control}
                rules={{ required: "Client is required" }}
                render={({ field }) => (
                  <ClientSelect
                    value={field.value}
                    onChange={(id, selected) => {
                      field.onChange(id)
                      setValue("name", selected?.name || "")
                    }}
                    className={errors.clientId ? "border-red-500" : ""}
                  />
                )}
              />
              {errors.clientId && <p className="text-xs text-red-500">{errors.clientId.message}</p>}
            </div>
          )}

          {type === "Vendor" && (
            <div className="col-span-1 space-y-1">
              <label className="text-sm font-medium"><span className="text-red-500">*</span> Vendor</label>
              <Controller
                name="vendorId"
                control={control}
                rules={{ required: "Vendor is required" }}
                render={({ field }) => (
                  <VendorSelect
                    value={field.value}
                    onChange={(id, selected) => {
                      field.onChange(id)
                      setValue("name", selected?.name || "")
                    }}
                    className={errors.vendorId ? "border-red-500" : ""}
                  />
                )}
              />
              {errors.vendorId && <p className="text-xs text-red-500">{errors.vendorId.message}</p>}
            </div>
          )}

          {type === "Combined" && (
            <div className="col-span-1 space-y-1">
              <label className="text-sm font-medium"><span className="text-red-500">*</span> Combined</label>
              <Controller
                name="combinedId"
                control={control}
                rules={{ required: "Combined is required" }}
                render={({ field }) => (
                  <ClientSelect
                    value={field.value}
                    onChange={(id, selected) => {
                      field.onChange(id)
                      setValue("name", selected?.name || "")
                    }}
                    placeholder="Select Combined"
                    className={errors.combinedId ? "border-red-500" : ""}
                  />
                )}
              />
              {errors.combinedId && <p className="text-xs text-red-500">{errors.combinedId.message}</p>}
            </div>
          )}

          {/* Payment Type - Second column for Client/Vendor/Combined */}
          {type !== "Account" && (
            <div className="space-y-1">
              <label className="text-sm font-medium">Payment Type</label>
              <Controller
                name="transactionType"
                control={control}
                render={({ field }) => (
                  <AntSelect
                    {...field}
                    className="w-full"
                    placeholder="Select Payment Type"
                    options={[
                      { label: "DEBIT", value: "DEBIT" },
                      { label: "CREDIT", value: "CREDIT" },
                    ]}
                  />
                )}
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Row 2 */}
          {type === "Account" && (
             <div className="space-y-1">
                <label className="text-sm font-medium">Payment Type</label>
                <Controller
                  name="transactionType"
                  control={control}
                  render={({ field }) => (
                    <AntSelect
                      {...field}
                      className="w-full"
                      placeholder="Select Payment Type"
                      options={[
                        { label: "DEBIT", value: "DEBIT" },
                        { label: "CREDIT", value: "CREDIT" },
                      ]}
                    />
                  )}
                />
              </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium"><span className="text-red-500">*</span> Amount</label>
            <Controller
              name="amount"
              control={control}
              rules={{ required: "Amount is required" }}
              render={({ field }) => (
                <AntInput
                  {...field}
                  type="number"
                  placeholder="Amount"
                  status={errors.amount ? "error" : ""}
                />
              )}
            />
            {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
          </div>

          {/* Date Field */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Date</label>
            <Controller
              name="date"
              control={control}
              render={({ field }) => (
                <DatePicker
                  className="w-full"
                  value={field.value ? dayjs(field.value) : null}
                  onChange={(date) => field.onChange(date ? date.format("YYYY-MM-DD") : "")}
                  format="DD-MM-YYYY"
                />
              )}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Note</label>
          <Controller
            name="note"
            control={control}
            render={({ field }) => (
              <AntInput.TextArea
                {...field}
                rows={4}
                placeholder="Note something"
              />
            )}
          />
        </div>

        <div className="pt-4">
          <AntButton
            type="primary"
            htmlType="submit"
            loading={submitting}
            className="bg-sky-500 hover:bg-sky-600 border-none h-10 px-6"
          >
            {submitText}
          </AntButton>
        </div>
      </form>
    </Drawer>
  )
}
