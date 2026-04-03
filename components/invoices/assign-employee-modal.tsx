"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import EmployeeSelect from "@/components/employees/employee-select"
import { DateInput } from "@/components/ui/date-input"
import { CustomDropdown } from "./custom-dropdown"
import { Upload } from "lucide-react"

interface AssignEmployeeModalProps {
  isOpen: boolean
  onClose: () => void
  invoiceId: string
  passports: any[]
}

export function AssignEmployeeModal({
  isOpen,
  onClose,
  invoiceId,
  passports
}: AssignEmployeeModalProps) {
  const [assignments, setAssignments] = useState<any[]>([])

  useEffect(() => {
    if (isOpen && passports.length > 0) {
      setAssignments(passports.map(p => ({
        passportNo: p.passportNo,
        employeeId: "",
        quantity: "",
        country: "",
        deliveryDate: undefined,
        expireDate: p.dateOfExpire ? new Date(p.dateOfExpire) : undefined,
        status: "",
        remarks: "",
      })))
    }
  }, [isOpen, passports])

  const handleUpdate = (index: number, field: string, value: any) => {
    const newAssignments = [...assignments]
    newAssignments[index] = { ...newAssignments[index], [field]: value }
    setAssignments(newAssignments)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[600px] max-h-[90vh] p-0 flex flex-col overflow-hidden bg-white">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="text-lg font-bold text-gray-800">
            Select Assign Employee
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-8">
            {assignments.map((assignment, index) => (
              <div key={index} className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-gray-100" />
                  <span className="text-sm font-bold text-gray-700 whitespace-nowrap">
                    Passport No: {assignment.passportNo}
                  </span>
                  <div className="h-px flex-1 bg-gray-100" />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      Select Employee <span className="text-red-500">*</span>
                    </Label>
                    <EmployeeSelect
                      value={assignment.employeeId}
                      onChange={(val) => handleUpdate(index, "employeeId", val)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Passport No</Label>
                    <Input 
                      value={assignment.passportNo} 
                      readOnly 
                      className="h-9 bg-gray-50 text-xs" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Quantity</Label>
                    <Input
                      placeholder="passport quantity"
                      value={assignment.quantity}
                      onChange={(e) => handleUpdate(index, "quantity", e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Country</Label>
                    <CustomDropdown
                      value={assignment.country}
                      onChange={(val) => handleUpdate(index, "country", val)}
                      options={[]}
                      placeholder="Select Co..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Delivery Date</Label>
                    <DateInput
                      value={assignment.deliveryDate}
                      onChange={(val) => handleUpdate(index, "deliveryDate", val)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Expire Date</Label>
                    <DateInput
                      value={assignment.expireDate}
                      onChange={(val) => handleUpdate(index, "expireDate", val)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Status</Label>
                    <CustomDropdown
                      value={assignment.status}
                      onChange={(val) => handleUpdate(index, "status", val)}
                      options={[]}
                      placeholder="Select em..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Remarks</Label>
                    <textarea
                      placeholder="Note something"
                      value={assignment.remarks}
                      onChange={(e) => handleUpdate(index, "remarks", e.target.value)}
                      className="w-full h-20 p-2 text-xs border rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Upload Docs</Label>
                    <div className="flex gap-2">
                      <Button variant="outline" className="h-9 text-xs flex-1 gap-2">
                        <Upload className="h-4 w-4" />
                        Doc image
                      </Button>
                      <div className="h-9 flex-1 border rounded-md" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="p-4 border-t shrink-0">
          <Button className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 rounded-md">
            Submit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
