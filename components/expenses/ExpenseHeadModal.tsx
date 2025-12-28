"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

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
  const { register, handleSubmit, reset, setError, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: {
      name: "",
      ...initialValues,
    },
  })

  useEffect(() => {
    if (open) {
      reset({ name: initialValues?.name || "" })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValues])

  const onSubmitInternal = async (vals: FormValues) => {
    if (!vals.name || !vals.name.trim()) {
      setError("name", { type: "required", message: "Head Name is required" })
      return
    }
    const ok = await Promise.resolve(onSubmit({ name: vals.name.trim() }))
    if (ok) onOpenChange(false)
  }

  const requiredMark = (label: string, required?: boolean) => (
    <span>
      {required && <span className="text-red-500 mr-1">*</span>}{label}
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
              <Label>{requiredMark("Head Name:", true)}</Label>
              <Input placeholder="Enter Head Name" {...register("name", { required: true })} />
              {errors.name && <div className="text-red-500 text-xs">Head Name is required</div>}
            </div>
            <div className="flex justify-start">
              <Button type="submit" className="bg-sky-500 hover:bg-sky-600 min-w-[120px]" disabled={isSubmitting}>
                {isSubmitting ? (<span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Submitting...</span>) : "Submit"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
