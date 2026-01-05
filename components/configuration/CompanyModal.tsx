"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import Image from "next/image"

type FormValues = {
  name: string
  contactPerson?: string
  designation?: string
  phone?: string
  address?: string
}

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  mode: "add" | "edit"
  initialValues?: Partial<FormValues>
  onSubmit: (values: FormValues) => Promise<boolean>
}

export default function CompanyModal({ open, onOpenChange, mode, initialValues, onSubmit }: Props) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>()

  useEffect(() => {
    if (open) {
      reset({
        name: "",
        contactPerson: "",
        designation: "",
        phone: "",
        address: "",
        ...initialValues
      })
    }
  }, [open, initialValues, reset])

  const onSubmitInternal = async (data: FormValues) => {
    const success = await onSubmit(data)
    if (success) {
      onOpenChange(false)
      reset()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add New Company" : "Edit Company"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmitInternal)} className="space-y-4">
          <div className="space-y-2">
            <Label>
              <span className="text-red-500 mr-1">*</span>Company Name:
            </Label>
            <Input 
              placeholder="Enter company name" 
              {...register("name", { required: "Company name is required" })} 
            />
            {errors.name && <span className="text-red-500 text-sm">{errors.name.message}</span>}
          </div>

          <div className="space-y-2">
            <Label>Contact Person:</Label>
            <Input 
              placeholder="Enter company contact person" 
              {...register("contactPerson")} 
            />
          </div>

          <div className="space-y-2">
            <Label>Designation:</Label>
            <Input 
              placeholder="Enter company designation" 
              {...register("designation")} 
            />
          </div>

          <div className="space-y-2">
            <Label>Phone:</Label>
            <Input 
              placeholder="Enter company phone" 
              {...register("phone")} 
            />
          </div>

          <div className="space-y-2">
            <Label>Address:</Label>
            <div className="relative">
              <Textarea 
                placeholder="Enter company address" 
                className="min-h-[80px] pr-8"
                {...register("address")} 
              />
              {/* WhatsApp Icon Placeholder matching the image */}
              <div className="absolute bottom-2 right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                 W
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Button type="submit" className="bg-sky-500 hover:bg-sky-600" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {mode === "add" ? "Submit" : "Update"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
