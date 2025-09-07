import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Edit2, Trash2, Check, X, Loader2, DollarSign, Calendar, FileText, History } from "lucide-react"
import type { Transaction } from "@/hooks/use-transactions"

interface TransactionListProps {
  transactions: Transaction[]
  loading: boolean
  onEdit: (transaction: Transaction) => void
  onDelete: (transaction: Transaction) => void
  onUpdate: (transactionId: string, updatedData: Partial<Transaction>) => Promise<void>
  editingTransactionId: string | null
  setEditingTransactionId: (id: string | null) => void
  isUpdating: boolean
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 2,
  }).format(amount)
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function TransactionList({
  transactions,
  loading,
  onEdit,
  onDelete,
  onUpdate,
  editingTransactionId,
  setEditingTransactionId,
  isUpdating
}: TransactionListProps) {
  const [editFormData, setEditFormData] = useState<Partial<Transaction>>({})

  const handleEditStart = (transaction: Transaction) => {
    setEditingTransactionId(transaction._id)
    setEditFormData({
      date: transaction.date,
      receivedAmount: transaction.receivedAmount,
      refundAmount: transaction.refundAmount || 0,
      notes: transaction.notes || ""
    })
  }

  const handleEditCancel = () => {
    setEditingTransactionId(null)
    setEditFormData({})
  }

  const handleEditSave = async (transactionId: string) => {
    await onUpdate(transactionId, editFormData)
    setEditingTransactionId(null)
    setEditFormData({})
  }

  const handleFieldChange = (field: keyof Transaction, value: string | number) => {
    setEditFormData(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Transaction History
          </CardTitle>
          <CardDescription>All payments and transactions for this client</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-muted-foreground">Loading transactions...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Transaction History
        </CardTitle>
        <CardDescription>
          All payments and transactions for this client
          {transactions.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Transactions Yet</h3>
            <p className="text-gray-500">
              No transaction records found for this client
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold text-gray-900">Transaction Date</TableHead>
                  <TableHead className="font-semibold text-gray-900">Received Amount</TableHead>
                  <TableHead className="font-semibold text-gray-900">Refund Amount</TableHead>
                  <TableHead className="font-semibold text-gray-900">Transaction Notes</TableHead>
                  <TableHead className="font-semibold text-gray-900 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction, index) => (
                  <TableRow 
                    key={transaction._id} 
                    className={`hover:bg-gray-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-25'
                    }`}
                  >
                    {editingTransactionId === transaction._id ? (
                      // Edit mode
                      <>
                        <TableCell className="py-4">
                          <div className="space-y-1">
                            <Label htmlFor={`edit-date-${transaction._id}`} className="text-xs text-gray-600">
                              Date
                            </Label>
                            <Input
                              id={`edit-date-${transaction._id}`}
                              type="date"
                              value={editFormData.date || transaction.date}
                              onChange={(e) => handleFieldChange('date', e.target.value)}
                              className="h-8"
                            />
                          </div>
                        </TableCell>
                        
                        <TableCell className="py-4">
                          <div className="space-y-1">
                            <Label htmlFor={`edit-received-${transaction._id}`} className="text-xs text-gray-600">
                              Received (BDT)
                            </Label>
                            <Input
                              id={`edit-received-${transaction._id}`}
                              type="number"
                              min="0"
                              step="0.01"
                              value={editFormData.receivedAmount ?? transaction.receivedAmount}
                              onChange={(e) => handleFieldChange('receivedAmount', Number.parseFloat(e.target.value) || 0)}
                              className="h-8"
                            />
                          </div>
                        </TableCell>
                        
                        <TableCell className="py-4">
                          <div className="space-y-1">
                            <Label htmlFor={`edit-refund-${transaction._id}`} className="text-xs text-gray-600">
                              Refund (BDT)
                            </Label>
                            <Input
                              id={`edit-refund-${transaction._id}`}
                              type="number"
                              min="0"
                              step="0.01"
                              value={editFormData.refundAmount ?? transaction.refundAmount ?? 0}
                              onChange={(e) => handleFieldChange('refundAmount', Number.parseFloat(e.target.value) || 0)}
                              className="h-8"
                            />
                          </div>
                        </TableCell>
                        
                        <TableCell className="py-4">
                          <div className="space-y-1">
                            <Label htmlFor={`edit-notes-${transaction._id}`} className="text-xs text-gray-600">
                              Notes
                            </Label>
                            <Textarea
                              id={`edit-notes-${transaction._id}`}
                              value={editFormData.notes ?? transaction.notes ?? ""}
                              onChange={(e) => handleFieldChange('notes', e.target.value)}
                              rows={2}
                              className="resize-none"
                            />
                          </div>
                        </TableCell>
                        
                        <TableCell className="py-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleEditCancel}
                              disabled={isUpdating}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleEditSave(transaction._id)}
                              disabled={isUpdating}
                              className="h-8 w-8 p-0"
                            >
                              {isUpdating ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      // View mode
                      <>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">
                              {formatDate(transaction.date)}
                            </span>
                          </div>
                        </TableCell>
                        
                        <TableCell className="py-4">
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-green-600">
                              {formatCurrency(transaction.receivedAmount)}
                            </span>
                          </div>
                        </TableCell>
                        
                        <TableCell className="py-4">
                          {transaction.refundAmount && transaction.refundAmount > 0 ? (
                            <div className="flex items-center gap-1">
                              <span className="font-semibold text-red-600">
                                {formatCurrency(transaction.refundAmount)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        
                        <TableCell className="py-4">
                          {transaction.notes ? (
                            <div className="flex items-start gap-2">
                              <FileText className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                              <p className="text-sm text-gray-700 line-clamp-2" title={transaction.notes}>
                                {transaction.notes}
                              </p>
                            </div>
                          ) : (
                            <span className="text-gray-400">No notes</span>
                          )}
                        </TableCell>
                        
                        <TableCell className="py-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditStart(transaction)}
                              className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
                              title="Edit Transaction"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onDelete(transaction)}
                              className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                              title="Delete Transaction"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}