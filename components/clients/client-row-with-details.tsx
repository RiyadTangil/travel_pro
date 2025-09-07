import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Archive,
  Calendar,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Edit,
  Eye,
  FileEdit,
  Loader2,
  Mail,
  MapPin,
  Phone,
  PlusCircle,
  Trash2,
} from "lucide-react";
import type { Client, B2CClient } from "@/hooks/use-clients";
import type { Transaction } from "@/hooks/use-transactions";

interface ClientRowWithDetailsProps {
  client: B2CClient;
  expandedClientId: string | null;
  setExpandedClientId: (id: string | null) => void;
  handleViewDetails: (client: Client) => void;
  handleEditClient: (client: Client) => void;
  handleDeleteClient: (client: Client) => void;
  handleAddTransaction: (clientId: string) => void;
  isSubmitting: boolean;
  addingTransaction: boolean;
  transactions: Transaction[];
  transactionsLoading: boolean;
  editingTransactionId: string | null;
  setEditingTransactionId: (id: string | null) => void;
  handleUpdateTransaction: (id: string, transaction: Transaction) => void;
  handleEditTransaction: (transaction: Transaction) => void;
  handleDeleteTransaction: (transaction: Transaction) => void;
  isDeletingTransaction: boolean;
  formatCurrency: (amount: number) => string;
  calculatePaymentProgress: (contractAmount: number, dueAmount: number) => number;
  newTransaction: {
    date: string;
    receivedAmount: number;
    refundAmount: number;
    notes: string;
  };
  setNewTransaction: (transaction: {
    date: string;
    receivedAmount: number;
    refundAmount: number;
    notes: string;
  }) => void;
  handleSaveTransaction: () => void;
  transactionErrors: {
    date?: string;
    receivedAmount?: string;
  };
}

export function ClientRowWithDetails({
  client,
  expandedClientId,
  setExpandedClientId,
  handleViewDetails,
  handleEditClient,
  handleDeleteClient,
  handleAddTransaction,
  isSubmitting,
  addingTransaction,
  transactions,
  transactionsLoading,
  editingTransactionId,
  setEditingTransactionId,
  handleUpdateTransaction,
  handleEditTransaction,
  handleDeleteTransaction,
  isDeletingTransaction,
  formatCurrency,
  calculatePaymentProgress,
  newTransaction,
  setNewTransaction,
  handleSaveTransaction,
  transactionErrors,
}: ClientRowWithDetailsProps) {
  const isExpanded = expandedClientId === client._id;
  const paymentProgress = calculatePaymentProgress(client.contractAmount, client.dueAmount);
  
  return (
    <>
      <TableRow key={client._id} className="hover:bg-gray-50/50 transition-colors">
        <TableCell className="w-[40px]">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setExpandedClientId(isExpanded ? null : client._id)}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </TableCell>
        <TableCell>
          <div className="font-medium">{client.name}</div>
          <div className="text-sm text-muted-foreground">{client.email}</div>
          <div className="text-sm text-muted-foreground">{client.phone}</div>
        </TableCell>
        <TableCell>
          {client.associatedB2BId ? (
            <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-purple-100 text-purple-800">
              B2B Referred
            </div>
          ) : (
            <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-green-100 text-green-800">
              Direct Client
            </div>
          )}
        </TableCell>
        <TableCell>
          <div className="font-medium">{client.passportNumber}</div>
        </TableCell>
        <TableCell>
          <div className="font-medium">{client.destination}</div>
        </TableCell>
        <TableCell>
          <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary/80">
            {client.status}
          </div>
        </TableCell>
        <TableCell className="text-center">
          <div className="flex flex-col items-center">
            <div className="text-sm font-medium">
              {formatCurrency(client.contractAmount)}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1 mb-1">
              <div
                className={`h-2.5 rounded-full ${paymentProgress === 100 ? "bg-green-500" : "bg-blue-500"}`}
                style={{ width: `${paymentProgress}%` }}
              ></div>
            </div>
            <div className="text-xs text-muted-foreground">
              {formatCurrency(client.contractAmount - client.dueAmount)} paid
            </div>
          </div>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
              onClick={() => handleViewDetails(client)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-green-500 hover:text-green-700 hover:bg-green-50"
              onClick={() => handleEditClient(client)}
            >
              <FileEdit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={() => handleDeleteClient(client)}
            >
              <Archive className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {isExpanded && (
        <TableRow>
          <TableCell colSpan={8} className="p-0">
            <div className="bg-gray-50/50 p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Financial Summary</h4>
                  <div className="bg-white p-4 rounded-md shadow-sm">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Total Contract:</span>
                        <span className="font-medium">{formatCurrency(client.contractAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Amount Paid:</span>
                        <span className="font-medium text-green-600">
                          {formatCurrency(client.contractAmount - client.dueAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Outstanding Balance:</span>
                        <span className="font-medium text-orange-600">
                          {formatCurrency(client.dueAmount)}
                        </span>
                      </div>
                      <div className="pt-2">
                        <div className="text-xs text-gray-500 mb-1 flex justify-between">
                          <span>Payment Progress</span>
                          <span>{paymentProgress.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${paymentProgress === 100 ? "bg-green-500" : "bg-blue-500"}`}
                            style={{ width: `${paymentProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Contact Information</h4>
                  <div className="bg-white p-4 rounded-md shadow-sm">
                    <div className="space-y-3">
                      <div className="flex items-start">
                        <Mail className="h-4 w-4 text-gray-500 mt-0.5 mr-2" />
                        <div>
                          <div className="text-sm font-medium">Email</div>
                          <div className="text-sm text-gray-500">{client.email || "Not provided"}</div>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <Phone className="h-4 w-4 text-gray-500 mt-0.5 mr-2" />
                        <div>
                          <div className="text-sm font-medium">Phone</div>
                          <div className="text-sm text-gray-500">{client.phone || "Not provided"}</div>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <FileEdit className="h-4 w-4 text-gray-500 mt-0.5 mr-2" />
                        <div>
                          <div className="text-sm font-medium">Passport</div>
                          <div className="text-sm text-gray-500">{client.passportNumber || "Not provided"}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Travel Details</h4>
                  <div className="bg-white p-4 rounded-md shadow-sm">
                    <div className="space-y-3">
                      <div className="flex items-start">
                        <MapPin className="h-4 w-4 text-gray-500 mt-0.5 mr-2" />
                        <div>
                          <div className="text-sm font-medium">Destination</div>
                          <div className="text-sm text-gray-500">{client.destination || "Not specified"}</div>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <Calendar className="h-4 w-4 text-gray-500 mt-0.5 mr-2" />
                        <div>
                          <div className="text-sm font-medium">Travel Date</div>
                          <div className="text-sm text-gray-500">
                            {client.travelDate ? new Date(client.travelDate).toLocaleDateString() : "Not specified"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <FileEdit className="h-4 w-4 text-gray-500 mt-0.5 mr-2" />
                        <div>
                          <div className="text-sm font-medium">Visa Type</div>
                          <div className="text-sm text-gray-500">{client.visaType || "Not specified"}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold">Transaction History</h4>
                  <div className="flex items-center">
                    <div className="text-sm text-gray-500 mr-4">
                      Current Outstanding: <span className="font-medium text-orange-600">{formatCurrency(client.dueAmount)}</span>
                    </div>
                    <Button
                      size="sm"
                      className="h-8"
                      onClick={() => handleAddTransaction(client._id)}
                      disabled={addingTransaction || isSubmitting}
                    >
                      <PlusCircle className="h-4 w-4 mr-1" />
                      Add Transaction
                    </Button>
                  </div>
                </div>

                {addingTransaction && client._id === expandedClientId && (
                  <div className="bg-white p-4 rounded-md shadow-sm mb-4 border border-blue-200">
                    <h5 className="font-medium text-sm mb-3">New Transaction</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                      <div className="space-y-1">
                        <Label htmlFor="transaction-date">Date</Label>
                        <Input
                          id="transaction-date"
                          type="date"
                          value={newTransaction.date}
                          onChange={(e) =>
                            setNewTransaction({ ...newTransaction, date: e.target.value })
                          }
                        />
                        {transactionErrors.date && (
                          <p className="text-xs text-red-500 mt-1">{transactionErrors.date}</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="received-amount">Received Amount (BDT)</Label>
                        <Input
                          id="received-amount"
                          type="number"
                          value={newTransaction.receivedAmount || ""}
                          onChange={(e) =>
                            setNewTransaction({
                              ...newTransaction,
                              receivedAmount: Number.parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                        {transactionErrors.receivedAmount && (
                          <p className="text-xs text-red-500 mt-1">
                            {transactionErrors.receivedAmount}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="refund-amount">Refund Amount (BDT)</Label>
                        <Input
                          id="refund-amount"
                          type="number"
                          value={newTransaction.refundAmount || ""}
                          onChange={(e) =>
                            setNewTransaction({
                              ...newTransaction,
                              refundAmount: Number.parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-1 mb-4">
                      <Label htmlFor="transaction-notes">Notes</Label>
                      <Textarea
                        id="transaction-notes"
                        value={newTransaction.notes}
                        onChange={(e) =>
                          setNewTransaction({ ...newTransaction, notes: e.target.value })
                        }
                      />
                    </div>

                    <div className="bg-gray-50 p-3 rounded-md mb-4">
                      <div className="text-sm font-medium mb-2">Transaction Impact</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="text-xs text-gray-500">Net Payment</div>
                          <div className="font-medium">
                            {formatCurrency(
                              newTransaction.receivedAmount - newTransaction.refundAmount
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">New Outstanding</div>
                          <div className="font-medium">
                            {formatCurrency(
                              client.dueAmount -
                                (newTransaction.receivedAmount - newTransaction.refundAmount)
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="mr-2"
                        onClick={() => handleAddTransaction("")}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveTransaction}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save Transaction"
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-md shadow-sm overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 border-b">
                        <TableHead className="font-semibold text-gray-900">Transaction Date</TableHead>
                        <TableHead className="font-semibold text-gray-900">Amount Received</TableHead>
                        <TableHead className="font-semibold text-gray-900">Refund Amount</TableHead>
                        <TableHead className="font-semibold text-gray-900">Transaction Notes</TableHead>
                        <TableHead className="text-right font-semibold text-gray-900">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactionsLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4">
                            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                            <p className="mt-2 text-sm text-muted-foreground">Loading transactions...</p>
                          </TableCell>
                        </TableRow>
                      ) : transactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4">
                            <p className="text-muted-foreground">
                              No transaction records found for this client
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        transactions.map((transaction, index) => (
                          <TableRow key={transaction._id} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                            {editingTransactionId === transaction._id ? (
                              // Editing mode
                              <TableCell colSpan={5}>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                                  <div className="space-y-1">
                                    <Label htmlFor={`edit-date-${transaction._id}`}>Date</Label>
                                    <Input
                                      id={`edit-date-${transaction._id}`}
                                      type="date"
                                      defaultValue={transaction.date}
                                      onChange={(e) => (transaction.date = e.target.value)}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label htmlFor={`edit-received-${transaction._id}`}>
                                      Received Amount (BDT)
                                    </Label>
                                    <Input
                                      id={`edit-received-${transaction._id}`}
                                      type="number"
                                      defaultValue={transaction.receivedAmount}
                                      onChange={(e) =>
                                        (transaction.receivedAmount =
                                          Number.parseFloat(e.target.value) || 0)
                                      }
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label htmlFor={`edit-refund-${transaction._id}`}>
                                      Refund Amount (BDT)
                                    </Label>
                                    <Input
                                      id={`edit-refund-${transaction._id}`}
                                      type="number"
                                      defaultValue={transaction.refundAmount || 0}
                                      onChange={(e) =>
                                        (transaction.refundAmount = Number.parseFloat(e.target.value) || 0)
                                      }
                                    />
                                  </div>
                                </div>
                                <div className="space-y-1 mb-4">
                                  <Label htmlFor={`edit-notes-${transaction._id}`}>Notes</Label>
                                  <Textarea
                                    id={`edit-notes-${transaction._id}`}
                                    defaultValue={transaction.notes}
                                    onChange={(e) => (transaction.notes = e.target.value)}
                                  />
                                </div>
                                <div className="flex justify-end">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="mr-2"
                                    onClick={() => setEditingTransactionId(null)}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleUpdateTransaction(transaction._id, transaction)}
                                    disabled={isSubmitting}
                                  >
                                    {isSubmitting ? (
                                      <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Updating...
                                      </>
                                    ) : (
                                      "Update"
                                    )}
                                  </Button>
                                </div>
                              </TableCell>
                            ) : (
                              <>
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-gray-500" />
                                    <span>{new Date(transaction.date).toLocaleDateString('en-US', { 
                                      year: 'numeric', 
                                      month: 'short', 
                                      day: 'numeric' 
                                    })}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <CreditCard className="h-4 w-4 text-green-500" />
                                    <span className="font-semibold text-green-600">
                                      {formatCurrency(transaction.receivedAmount)}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {transaction.refundAmount && transaction.refundAmount > 0 ? (
                                    <div className="flex items-center gap-2">
                                      <CreditCard className="h-4 w-4 text-red-500" />
                                      <span className="font-semibold text-red-600">
                                        {formatCurrency(transaction.refundAmount)}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 text-sm">No refund</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {transaction.notes ? (
                                    <div className="max-w-xs">
                                      <p className="text-sm text-gray-700 truncate" title={transaction.notes}>
                                        {transaction.notes}
                                      </p>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 text-sm italic">No notes</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                      onClick={() => handleEditTransaction(transaction)}
                                      disabled={isSubmitting}
                                      title="Edit Transaction"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                      onClick={() => handleDeleteTransaction(transaction)}
                                      disabled={isDeletingTransaction}
                                      title="Delete Transaction"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}