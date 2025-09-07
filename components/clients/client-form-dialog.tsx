import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, Check, Loader2, X } from "lucide-react"
import type { B2CClient, B2BClient } from "@/hooks/use-clients"

interface ClientFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "add" | "edit"
  client?: B2CClient
  b2bClients: B2BClient[]
  onSubmit: (formData: ClientFormData, selectedB2BClient: string) => Promise<void>
  isSubmitting: boolean
  isDuplicateCheck: boolean
  submitError: string | null
}

export interface ClientFormData {
  name: string
  email: string
  phone: string
  passportNumber: string
  address: string
  destination: string
  status: string
  visaType: string
  contractAmount: string
  initialPayment: string
  notes: string
}

interface FormErrors {
  name?: string
  email?: string
  phone?: string
  passportNumber?: string
  destination?: string
  contractAmount?: string
  initialPayment?: string
}

const getStatusesForClientType = (clientType: string) => {
  const statusOptions = {
    "saudi-kuwait": [
      { value: "file-ready", label: "File Ready" },
      { value: "medical", label: "Medical" },
      { value: "mofa", label: "MOFA" },
      { value: "visa-stamping", label: "Visa Stamping" },
      { value: "fingerprint", label: "Fingerprint" },
      { value: "manpower", label: "Manpower" },
      { value: "flight-ticket", label: "Flight/Ticket" },
      { value: "completed", label: "Completed" },
    ],
    "other-countries": [
      { value: "file-ready", label: "File Ready" },
      { value: "medical", label: "Medical" },
      { value: "visa-stamping", label: "Visa Stamping" },
      { value: "flight-ticket", label: "Flight/Ticket" },
      { value: "completed", label: "Completed" },
    ],
    "omra-visa": [
      { value: "file-ready", label: "File Ready" },
      { value: "visa-stamping", label: "Visa Stamping" },
      { value: "flight-ticket", label: "Flight/Ticket" },
      { value: "completed", label: "Completed" },
    ],
  }
  return statusOptions[clientType] || statusOptions["saudi-kuwait"]
}

const validateForm = (formData: ClientFormData, mode: "add" | "edit"): FormErrors => {
  const errors: FormErrors = {}

  if (!formData.name.trim()) {
    errors.name = "Name is required"
  }

  if (!formData.email.trim()) {
    errors.email = "Email is required"
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    errors.email = "Please enter a valid email address"
  }

  if (!formData.phone.trim()) {
    errors.phone = "Phone number is required"
  }

  if (!formData.passportNumber.trim()) {
    errors.passportNumber = "Passport number is required"
  }

  if (!formData.destination.trim()) {
    errors.destination = "Destination is required"
  }

  if (mode === "add") {
    if (!formData.contractAmount || Number.parseFloat(formData.contractAmount) <= 0) {
      errors.contractAmount = "Contract amount must be greater than 0"
    }

    if (!formData.initialPayment || Number.parseFloat(formData.initialPayment) < 0) {
      errors.initialPayment = "Initial payment must be 0 or greater"
    }

    if (formData.contractAmount && formData.initialPayment) {
      const contract = Number.parseFloat(formData.contractAmount)
      const initial = Number.parseFloat(formData.initialPayment)
      if (initial > contract) {
        errors.initialPayment = "Initial payment cannot exceed contract amount"
      }
    }
  }

  return errors
}

const getFieldIcon = (fieldName: string, formErrors: FormErrors) => {
  if (formErrors[fieldName]) {
    return <X className="h-4 w-4 text-red-500" />
  }
  return <Check className="h-4 w-4 text-green-500" />
}

const getFieldClassName = (fieldName: string, formErrors: FormErrors) => {
  return formErrors[fieldName] ? "border-red-500 focus:border-red-500 pr-10" : "pr-10"
}

export function ClientFormDialog({
  open,
  onOpenChange,
  mode,
  client,
  b2bClients,
  onSubmit,
  isSubmitting,
  isDuplicateCheck,
  submitError
}: ClientFormDialogProps) {
  const [formData, setFormData] = useState<ClientFormData>({
    name: "",
    email: "",
    phone: "",
    passportNumber: "",
    address: "",
    destination: "",
    status: "file-ready",
    visaType: "",
    contractAmount: "",
    initialPayment: "",
    notes: ""
  })
  
  const [selectedClientType, setSelectedClientType] = useState("saudi-kuwait")
  const [selectedB2BClient, setSelectedB2BClient] = useState("none")
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  
  const hasB2BClients = b2bClients.length > 0

  // Initialize form data when dialog opens or client changes
  useEffect(() => {
    if (open) {
      if (mode === "edit" && client) {
        setFormData({
          name: client.name || "",
          email: client.email || "",
          phone: client.phone || "",
          passportNumber: client.passportNumber || "",
          address: client.address || "",
          destination: client.destination || "",
          status: client.status || "file-ready",
          visaType: client.visaType || "",
          contractAmount: client.contractAmount?.toString() || "",
          initialPayment: client.initialPayment?.toString() || "",
          notes: client.notes || ""
        })
        setSelectedB2BClient(client.associatedB2BId || "none")
      } else {
        // Reset form for add mode
        setFormData({
          name: "",
          email: "",
          phone: "",
          passportNumber: "",
          address: "",
          destination: "",
          status: "file-ready",
          visaType: "",
          contractAmount: "",
          initialPayment: "",
          notes: ""
        })
        setSelectedB2BClient("none")
        setSelectedClientType("saudi-kuwait")
      }
      setFormErrors({})
    }
  }, [open, mode, client])

  const handleFieldChange = (field: keyof ClientFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const errors = validateForm(formData, mode)
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    await onSubmit(formData, selectedB2BClient)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add New Client" : "Edit Client"}</DialogTitle>
          <DialogDescription>
            {mode === "add" 
              ? "Enter the client details to create a new client record"
              : "Update the client details"
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4 px-1">
              {submitError && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">{submitError}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <div className="relative">
                    <Input
                      id="name"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) => handleFieldChange("name", e.target.value)}
                      className={getFieldClassName("name", formErrors)}
                      required
                      aria-describedby={formErrors.name ? "name-error" : undefined}
                    />
                    {(formData.name || formErrors.name) && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        {getFieldIcon("name", formErrors)}
                      </div>
                    )}
                  </div>
                  {formErrors.name && (
                    <p id="name-error" className="text-sm text-red-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {formErrors.name}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <div className="relative">
                    <Input
                      id="phone"
                      placeholder="+1 234 567 890"
                      value={formData.phone}
                      onChange={(e) => handleFieldChange("phone", e.target.value)}
                      className={getFieldClassName("phone", formErrors)}
                      required
                      aria-describedby={formErrors.phone ? "phone-error" : undefined}
                    />
                    {(formData.phone || formErrors.phone) && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        {getFieldIcon("phone", formErrors)}
                      </div>
                    )}
                  </div>
                  {formErrors.phone && (
                    <p id="phone-error" className="text-sm text-red-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {formErrors.phone}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      value={formData.email}
                      onChange={(e) => handleFieldChange("email", e.target.value)}
                      className={getFieldClassName("email", formErrors)}
                      required
                      aria-describedby={formErrors.email ? "email-error" : undefined}
                    />
                    {(formData.email || formErrors.email) && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        {getFieldIcon("email", formErrors)}
                      </div>
                    )}
                  </div>
                  {formErrors.email && (
                    <p id="email-error" className="text-sm text-red-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {formErrors.email}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="passportNumber">Passport Number *</Label>
                  <div className="relative">
                    <Input
                      id="passportNumber"
                      placeholder="A12345678"
                      value={formData.passportNumber}
                      onChange={(e) => handleFieldChange("passportNumber", e.target.value.toUpperCase())}
                      className={getFieldClassName("passportNumber", formErrors)}
                      required
                      aria-describedby={formErrors.passportNumber ? "passport-error" : undefined}
                    />
                    {(formData.passportNumber || formErrors.passportNumber) && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        {getFieldIcon("passportNumber", formErrors)}
                      </div>
                    )}
                  </div>
                  {formErrors.passportNumber && (
                    <p id="passport-error" className="text-sm text-red-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {formErrors.passportNumber}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="123 Main Street, City, Country"
                  value={formData.address}
                  onChange={(e) => handleFieldChange("address", e.target.value)}
                />
              </div>

              {/* B2B Client selection for reference - only show if B2B clients exist */}
              {hasB2BClients && (
                <div className="space-y-2">
                  <Label htmlFor="b2bClient">Referred by B2B Client (optional)</Label>
                  <Select value={selectedB2BClient} onValueChange={setSelectedB2BClient}>
                    <SelectTrigger id="b2bClient">
                      <SelectValue placeholder="Select B2B client (if referred)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Direct Client (No B2B Reference)</SelectItem>
                      {b2bClients.map((client) => (
                        <SelectItem key={client._id} value={client._id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="destination">Destination *</Label>
                  <div className="relative">
                    <Input
                      id="destination"
                      placeholder="Dubai, UAE"
                      value={formData.destination}
                      onChange={(e) => handleFieldChange("destination", e.target.value)}
                      className={getFieldClassName("destination", formErrors)}
                      required
                      aria-describedby={formErrors.destination ? "destination-error" : undefined}
                    />
                    {getFieldIcon("destination", formErrors)}
                  </div>
                  {formErrors.destination && (
                    <p id="destination-error" className="text-sm text-red-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {formErrors.destination}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="clientType">Client Type</Label>
                  <Select value={selectedClientType} onValueChange={setSelectedClientType}>
                    <SelectTrigger id="clientType">
                      <SelectValue placeholder="Select client type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="saudi-kuwait">Saudi & Kuwait</SelectItem>
                      <SelectItem value="other-countries">Other Countries</SelectItem>
                      <SelectItem value="omra-visa">Omra Visa (Saudi)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Current Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {getStatusesForClientType(selectedClientType).map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="visaType">Visa Type</Label>
                  <Input
                    id="visaType"
                    placeholder="Work Visa, Tourist Visa, etc."
                    value={formData.visaType}
                    onChange={(e) => handleFieldChange("visaType", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contractAmount">Contract Amount (BDT) *</Label>
                  <div className="relative">
                    <Input
                      id="contractAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.contractAmount}
                      onChange={(e) => handleFieldChange("contractAmount", e.target.value)}
                      className={mode === "edit" ? "bg-gray-50 text-gray-600 cursor-not-allowed" : getFieldClassName("contractAmount", formErrors)}
                      required={mode === "add"}
                      disabled={mode === "edit"}
                      aria-describedby={formErrors.contractAmount ? "contract-error" : undefined}
                    />
                    {mode === "add" && getFieldIcon("contractAmount", formErrors)}
                  </div>
                  {mode === "edit" && (
                    <p className="text-xs text-gray-500">Contract amount cannot be modified after creation</p>
                  )}
                  {formErrors.contractAmount && (
                    <p id="contract-error" className="text-sm text-red-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {formErrors.contractAmount}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="initialPayment">Initial Payment (BDT) *</Label>
                  <div className="relative">
                    <Input
                      id="initialPayment"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.initialPayment}
                      onChange={(e) => handleFieldChange("initialPayment", e.target.value)}
                      className={mode === "edit" ? "bg-gray-50 text-gray-600 cursor-not-allowed" : getFieldClassName("initialPayment", formErrors)}
                      required={mode === "add"}
                      disabled={mode === "edit"}
                      aria-describedby={formErrors.initialPayment ? "payment-error" : undefined}
                    />
                    {mode === "add" && getFieldIcon("initialPayment", formErrors)}
                  </div>
                  {mode === "edit" && (
                    <p className="text-xs text-gray-500">Initial payment cannot be modified after creation</p>
                  )}
                  {formErrors.initialPayment && (
                    <p id="payment-error" className="text-sm text-red-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {formErrors.initialPayment}
                    </p>
                  )}
                  {mode === "add" && formData.contractAmount && formData.initialPayment && (
                    <p className="text-sm text-gray-600">
                      Due Amount: {(Number.parseFloat(formData.contractAmount) - Number.parseFloat(formData.initialPayment)).toFixed(2)} BDT
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Enter any additional information about the client"
                  value={formData.notes}
                  onChange={(e) => handleFieldChange("notes", e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            
            <DialogFooter className="sticky bottom-0 bg-white pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || isDuplicateCheck}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {mode === "add" ? "Creating..." : "Updating..."}
                  </>
                ) : isDuplicateCheck ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  mode === "add" ? "Save Client" : "Update Client"
                )}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}