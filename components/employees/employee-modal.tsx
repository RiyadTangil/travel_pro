"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Props = {
  open: boolean
  onClose: () => void
  onSubmit?: (payload: any) => Promise<void> | void
  mode?: "add" | "view" | "edit"
  initialData?: any
}

const DEPARTMENTS = [
  "All Over",
  "Admin & HR",
  "Audit",
  "Customer Service",
  "Finance & Accounts",
  "Finance and Accounting",
  "Hajj & Umrah",
  "Human Resources (HR)",
  "Information Technology (IT)",
  "IT & Technology",
  "Management",
  "Office Assistance",
  "Operations",
  "Production or Manufacturing",
  "Project Management Office (PMO)",
  "Quality Assurance (QA)",
  "Research and Development (R&D)",
  "Reservation & Ticket",
  "Sales & Marketing",
]

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

export function EmployeeModal({ open, onClose, onSubmit, mode = "add", initialData }: Props) {
  const [idCardNo, setIdCardNo] = useState("")
  const [name, setName] = useState("")
  const [department, setDepartment] = useState<string>("")
  const [designation, setDesignation] = useState<string>("")
  const [bloodGroup, setBloodGroup] = useState<string>("")
  const [salary, setSalary] = useState("")
  const [commission, setCommission] = useState("")
  const [email, setEmail] = useState("")
  const [mobile, setMobile] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [appointmentDate, setAppointmentDate] = useState("")
  const [joiningDate, setJoiningDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [address, setAddress] = useState("")
  const [status, setStatus] = useState<"active" | "inactive">("active")
  const [designations, setDesignations] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch("/api/designations")
      .then((r) => r.json())
      .then((d) => setDesignations(d.data || []))
      .catch(() => setDesignations([]))
  }, [])

  useEffect(() => {
    if (!open || !initialData) return
    setIdCardNo(initialData.idCardNo || "")
    setName(initialData.name || "")
    setDepartment(initialData.department || "")
    setDesignation(initialData.designation || "")
    setBloodGroup(initialData.bloodGroup || "")
    setSalary(initialData.salary?.toString?.() || initialData.salary || "")
    setCommission(initialData.commission?.toString?.() || initialData.commission || "")
    setEmail(initialData.email || "")
    setMobile(initialData.mobile || "")
    setBirthDate(initialData.birthDate || "")
    setAppointmentDate(initialData.appointmentDate || "")
    setJoiningDate(initialData.joiningDate || new Date().toISOString().slice(0, 10))
    setAddress(initialData.address || "")
    setStatus(initialData.active ? "active" : "inactive")
  }, [open, initialData])

  const disabled = mode === "view"
  const requiredMissing = !name || !department || !designation || !salary || !mobile || typeof status === "undefined"

  const submit = async () => {
    if (!onSubmit || requiredMissing) return
    setSubmitting(true)
    await onSubmit({
      idCardNo,
      name,
      department,
      designation,
      bloodGroup,
      salary,
      commission,
      email,
      mobile,
      birthDate,
      appointmentDate,
      joiningDate,
      address,
      active: status === "active",
    })
    setSubmitting(false)
    onClose()
  }

  const handleSubmit = () => {
    const payload = {
      idCardNo,
      name,
      department,
      designation,
      bloodGroup,
      salary,
      commission,
      email,
      mobile,
      birthDate,
      appointmentDate,
      joiningDate,
      address,
      active: status === "active",
    }
    onSubmit?.(payload)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{mode === "view" ? "View Employee" : mode === "edit" ? "Edit Employee" : "Add New Employee"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
          <div className="space-y-2">
            <Label>ID Card No</Label>
            <Input placeholder="Employee ID Card No" value={idCardNo} onChange={(e) => setIdCardNo(e.target.value)} disabled={disabled} />
          </div>
          <div className="space-y-2">
            <Label>Employee Name <span className="text-red-500">*</span></Label>
            <Input placeholder="Employee Name" value={name} onChange={(e) => setName(e.target.value)} disabled={disabled} />
          </div>

          <div className="space-y-2">
            <Label>Department <span className="text-red-500">*</span></Label>
            <Select value={department} onValueChange={setDepartment} disabled={disabled}>
              <SelectTrigger><SelectValue placeholder="Select Department" /></SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Designation <span className="text-red-500">*</span></Label>
            <Select value={designation} onValueChange={setDesignation} disabled={disabled}>
              <SelectTrigger><SelectValue placeholder="Select Designation" /></SelectTrigger>
              <SelectContent>
                {designations.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Blood Group</Label>
            <Select value={bloodGroup} onValueChange={setBloodGroup} disabled={disabled}>
              <SelectTrigger><SelectValue placeholder="Select Blood Group" /></SelectTrigger>
              <SelectContent>
                {BLOOD_GROUPS.map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Salary <span className="text-red-500">*</span></Label>
            <Input placeholder="Salary" value={salary} onChange={(e) => setSalary(e.target.value)} disabled={disabled} />
          </div>

          <div className="space-y-2">
            <Label>Commission</Label>
            <Input placeholder="Commission" value={commission} onChange={(e) => setCommission(e.target.value)} disabled={disabled} />
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={disabled} />
          </div>

          <div className="space-y-2">
            <Label>Mobile <span className="text-red-500">*</span></Label>
            <Input placeholder="Mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} disabled={disabled} />
          </div>

          <div className="space-y-2">
            <Label>Birth Date</Label>
            <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} disabled={disabled} />
          </div>

          <div className="space-y-2">
            <Label>Appointment Date</Label>
            <Input type="date" value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} disabled={disabled} />
          </div>

          <div className="space-y-2">
            <Label>Joining Date</Label>
            <Input type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} disabled={disabled} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Address</Label>
            <Textarea placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} disabled={disabled} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Status <span className="text-red-500">*</span></Label>
            <RadioGroup value={status} onValueChange={disabled ? () => {} : (v) => setStatus(v as any)} className="flex items-center gap-6">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="active" id="status-active" />
                <Label htmlFor="status-active">Active</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="inactive" id="status-inactive" />
                <Label htmlFor="status-inactive">Inactive</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t mt-2">
          <Button variant="outline" onClick={onClose}>{mode === "view" ? "Close" : "Cancel"}</Button>
          {mode !== "view" && (
            <Button onClick={submit} className="bg-blue-600" disabled={requiredMissing || submitting}>
              {mode === "edit" ? (submitting ? "Updating..." : "Update") : (submitting ? "Submitting..." : "Submit")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}