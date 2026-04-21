"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type FormValues = {
  name: string
}

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  mode: "add" | "edit"
  initialValues?: Partial<FormValues>
  onSubmit: (values: FormValues) => Promise<boolean> | boolean
}

export default function ExpenseHeadModal({ open, onOpenChange, mode, initialValues, onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { name: "" },
  })

  useEffect(() => {
    if (open) {
      reset({ name: initialValues?.name?.trim() || "" })
    }
  }, [open, initialValues, reset])

  const onSubmitInternal = async (vals: FormValues) => {
    const ok = await Promise.resolve(onSubmit({ name: vals.name.trim() }))
    if (ok) onOpenChange(false)
  }

  const requiredMark = (label: string, required?: boolean) => (
    <span>
      {required && <span className="text-red-500 mr-1">*</span>}
      {label}
    </span>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add Expense Head" : "Edit Expense Head"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmitInternal)}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="expense-head-name">{requiredMark("Head Name:", true)}</Label>
              <Input
                id="expense-head-name"
                placeholder="Enter Head Name"
                className={cn(errors.name && "border-red-500 ring-1 ring-red-500")}
                {...register("name", { required: "Head name is required" })}
              />
              {errors.name && (
                <p className="text-xs text-red-500 font-medium">{errors.name.message}</p>
              )}
            </div>
            <div className="flex justify-start">
              <Button type="submit" className="bg-sky-500 hover:bg-sky-600 min-w-[120px]" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </span>
                ) : (
                  "Submit"
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
