import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, X, Loader2, DollarSign, Calendar, FileText } from "lucide-react"
import type { Transaction } from "@/hooks/use-transactions"

interface TransactionFormProps {
  mode: "add" | "edit"
  transaction?: Transaction
  clientId: string
  clientName: string
  clientDueAmount: number
  onSave: (transactionData: TransactionFormData) => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
}

export interface TransactionFormData {
  clientId: string
  clientName: string
  date: string
  receivedAmount: number
  refundAmount: number
  notes: string
  transactionType: "B2C"
}

interface TransactionErrors {
  date?: string
  receivedAmount?: string
  refundAmount?: string
}

const validateTransactionForm = (formData: TransactionFormData): TransactionErrors => {
  const errors: TransactionErrors = {}
  const today = new Date()
  today.setHours(23, 59, 59, 999)

  if (!formData.date) {
    errors.date = "Transaction date is required"
  } else {
    const transactionDate = new Date(formData.date)
    if (transactionDate > today) {
      errors.date = "Transaction date cannot be in the future"
    }
  }

  if (formData.receivedAmount <= 0) {
    errors.receivedAmount = "Received amount must be greater than 0"
  }

  if (formData.refundAmount < 0) {
    errors.refundAmount = "Refund amount cannot be negative"
  }

  if (formData.refundAmount > formData.receivedAmount) {
    errors.refundAmount = "Refund amount cannot exceed received amount"
  }

  return errors
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function TransactionForm({
  mode,
  transaction,
  clientId,
  clientName,
  clientDueAmount,
  onSave,
  onCancel,
  isSubmitting
}: TransactionFormProps) {
  const [formData, setFormData] = useState<TransactionFormData>({
    clientId,
    clientName,
    date: new Date().toISOString().split('T')[0],
    receivedAmount: 0,
    refundAmount: 0,
    notes: "",
    transactionType: "B2C"
  })
  
  const [errors, setErrors] = useState<TransactionErrors>({})

  // Initialize form data when transaction changes (for edit mode)
  useEffect(() => {
    if (mode === "edit" && transaction) {
      setFormData({
        clientId: transaction.clientId,
        clientName: transaction.clientName,
        date: transaction.date,
        receivedAmount: transaction.receivedAmount,
        refundAmount: transaction.refundAmount || 0,
        notes: transaction.notes || "",
        transactionType: transaction.transactionType
      })
    } else if (mode === "add") {
      setFormData({
        clientId,
        clientName,
        date: new Date().toISOString().split('T')[0],
        receivedAmount: 0,
        refundAmount: 0,
        notes: "",
        transactionType: "B2C"
      })
    }
    setErrors({})
  }, [mode, transaction, clientId, clientName])

  const handleFieldChange = (field: keyof TransactionFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field as keyof TransactionErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validationErrors = validateTransactionForm(formData)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    await onSave(formData)
  }

  const netAmount = formData.receivedAmount - formData.refundAmount
  const newDueAmount = Math.max(0, clientDueAmount - netAmount)

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          {mode === "add" ? "New Transaction" : "Edit Transaction"}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Transaction Date *
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleFieldChange("date", e.target.value)}
                className={errors.date ? "border-red-500 focus:border-red-500" : ""}
                required
                aria-describedby={errors.date ? "date-error" : undefined}
              />
              {errors.date && (
                <p id="date-error" className="text-sm text-red-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {errors.date}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="receivedAmount">
                Received Amount (BDT) *
              </Label>
              <Input
                id="receivedAmount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formData.receivedAmount || ""}
                onChange={(e) => handleFieldChange("receivedAmount", Number.parseFloat(e.target.value) || 0)}
                className={errors.receivedAmount ? "border-red-500 focus:border-red-500" : ""}
                required
                aria-describedby={errors.receivedAmount ? "received-amount-error" : undefined}
              />
              {errors.receivedAmount && (
                <p id="received-amount-error" className="text-sm text-red-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {errors.receivedAmount}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="refundAmount">
                Refund Amount (BDT)
              </Label>
              <Input
                id="refundAmount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formData.refundAmount || ""}
                onChange={(e) => handleFieldChange("refundAmount", Number.parseFloat(e.target.value) || 0)}
                className={errors.refundAmount ? "border-red-500 focus:border-red-500" : ""}
                aria-describedby={errors.refundAmount ? "refund-amount-error" : undefined}
              />
              {errors.refundAmount && (
                <p id="refund-amount-error" className="text-sm text-red-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {errors.refundAmount}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                Transaction Notes
              </Label>
              <Textarea
                id="notes"
                placeholder="Additional details about this transaction"
                value={formData.notes}
                onChange={(e) => handleFieldChange("notes", e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          {/* Transaction Impact Preview */}
          {(formData.receivedAmount > 0 || formData.refundAmount > 0) && (
            <Alert className="border-blue-200 bg-blue-50">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <AlertDescription>
                <h5 className="text-sm font-medium text-blue-900 mb-2">Transaction Impact</h5>
                <div className="space-y-1 text-sm text-blue-800">
                  <div className="flex justify-between">
                    <span>Net Amount:</span>
                    <span className="font-medium">
                      {netAmount >= 0 ? "+" : ""}{formatCurrency(netAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>New Due Amount:</span>
                    <span className="font-medium">
                      {formatCurrency(newDueAmount)}
                    </span>
                  </div>
                  {formData.refundAmount > 0 && (
                    <div className="mt-2 p-2 bg-yellow-100 rounded text-yellow-800 text-xs">
                      ⚠️ This transaction includes a refund of {formatCurrency(formData.refundAmount)}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || (formData.receivedAmount === 0 && formData.refundAmount === 0)}
              className={formData.receivedAmount > 0 || formData.refundAmount > 0 ? "bg-green-600 hover:bg-green-700" : ""}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  {mode === "add" ? "Saving..." : "Updating..."}
                </>
              ) : (
                <>
                  <DollarSign className="h-4 w-4 mr-1" />
                  {mode === "add" ? "Save Transaction" : "Update Transaction"}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}