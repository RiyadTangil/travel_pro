import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  ChevronDown,
  ChevronUp,
  Eye,
  FileEdit,
  Trash2,
  Plus,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
} from "lucide-react"
import type { B2CClient, B2BClient } from "@/hooks/use-clients"

interface ClientTableProps {
  clients: B2CClient[]
  b2bClients: B2BClient[]
  loading: boolean
  onViewDetails: (client: B2CClient) => void
  onEditClient: (client: B2CClient) => void
  onDeleteClient: (client: B2CClient) => void
  onAddTransaction: (clientId: string, clientName: string) => void
  addingTransaction: boolean
  isSubmitting: boolean
}

const getStatusBadge = (status: string) => {
  const statusStyles = {
    "file-ready": "bg-blue-100 text-blue-800",
    medical: "bg-purple-100 text-purple-800",
    mofa: "bg-yellow-100 text-yellow-800",
    "visa-stamping": "bg-indigo-100 text-indigo-800",
    fingerprint: "bg-pink-100 text-pink-800",
    manpower: "bg-orange-100 text-orange-800",
    "flight-ticket": "bg-green-100 text-green-800",
    completed: "bg-green-100 text-green-800",
  }

  const statusLabels = {
    "file-ready": "File Ready",
    medical: "Medical",
    mofa: "MOFA",
    "visa-stamping": "Visa Stamping",
    fingerprint: "Fingerprint",
    manpower: "Manpower",
    "flight-ticket": "Flight/Ticket",
    completed: "Completed",
  }

  return (
    <Badge className={statusStyles[status] || "bg-gray-100 text-gray-800"}>
      {statusLabels[status] || status}
    </Badge>
  )
}

const getClientSourceBadge = (associatedB2BId: string | undefined, b2bClients: B2BClient[]) => {
  if (associatedB2BId) {
    const b2bClient = b2bClients.find((client) => client._id === associatedB2BId)
    return (
      <Badge className="bg-purple-100 text-purple-800">
        {b2bClient ? `via ${b2bClient.name}` : "B2B Referred"}
      </Badge>
    )
  }
  return <Badge className="bg-green-100 text-green-800">Direct Client</Badge>
}

const formatCurrency = (amount: number) => {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return "0 BDT"
  }
  return `${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} BDT`
}

const formatCurrencyWithColor = (amount: number, isOverdue: boolean = false) => {
  const formatted = formatCurrency(amount)
  const colorClass = amount > 0 ? (isOverdue ? "text-red-600 font-semibold" : "text-orange-600 font-medium") : "text-green-600"
  return { formatted, colorClass }
}

const calculatePaymentProgress = (contractAmount: number, dueAmount: number) => {
  if (contractAmount <= 0) return 0
  const paidAmount = contractAmount - dueAmount
  return Math.max(0, Math.min(100, (paidAmount / contractAmount) * 100))
}

export function ClientTable({
  clients,
  b2bClients,
  loading,
  onViewDetails,
  onEditClient,
  onDeleteClient,
  onAddTransaction,
  addingTransaction,
  isSubmitting
}: ClientTableProps) {
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null)

  const toggleRowExpansion = (clientId: string) => {
    setExpandedClientId(expandedClientId === clientId ? null : clientId)
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50/50">
            <TableHead className="w-12"></TableHead>
            <TableHead className="font-semibold">Client Information</TableHead>
            <TableHead className="font-semibold">Source</TableHead>
            <TableHead className="font-semibold">Passport</TableHead>
            <TableHead className="font-semibold">Destination</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold text-center">Financial Status</TableHead>
            <TableHead className="font-semibold text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8">
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-muted-foreground">Loading clients...</p>
                </div>
              </TableCell>
            </TableRow>
          ) : clients.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8">
                <p className="text-muted-foreground">No clients found</p>
              </TableCell>
            </TableRow>
          ) : (
            clients.map((client) => (
              <>
                <TableRow key={client._id} className="hover:bg-gray-50/50 transition-colors">
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleRowExpansion(client._id)}
                      className="h-8 w-8 hover:bg-blue-50"
                      aria-label={expandedClientId === client._id ? "Collapse client details" : "Expand client details"}
                    >
                      {expandedClientId === client._id ? (
                        <ChevronUp className="h-4 w-4 text-blue-600" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium text-gray-900">{client.name}</div>
                      <div className="text-sm text-gray-500">{client.email}</div>
                      {client.phone && (
                        <div className="text-sm text-gray-500">{client.phone}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getClientSourceBadge(client.associatedB2BId, b2bClients)}</TableCell>
                  <TableCell>
                    <div className="font-mono text-sm bg-gray-50 px-2 py-1 rounded border">
                      {client.passportNumber}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{client.destination}</div>
                    {client.visaType && (
                      <div className="text-sm text-gray-500">{client.visaType}</div>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(client.status)}</TableCell>
                  <TableCell className="text-center">
                    <div className="space-y-2">
                      <div className="flex flex-col items-center space-y-1">
                        <div className="text-sm font-medium text-gray-700">
                          Contract: {formatCurrency(client.contractAmount)}
                        </div>
                        <div className={`text-sm font-medium ${
                          formatCurrencyWithColor(client.dueAmount, client.dueAmount > client.contractAmount * 0.8).colorClass
                        }`}>
                          Due: {formatCurrencyWithColor(client.dueAmount).formatted}
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            calculatePaymentProgress(client.contractAmount, client.dueAmount) === 100 
                              ? 'bg-green-500' 
                              : calculatePaymentProgress(client.contractAmount, client.dueAmount) > 50 
                              ? 'bg-blue-500' 
                              : 'bg-orange-500'
                          }`}
                          style={{ width: `${calculatePaymentProgress(client.contractAmount, client.dueAmount)}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {Math.round(calculatePaymentProgress(client.contractAmount, client.dueAmount))}% paid
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => onViewDetails(client)}
                        className="h-8 w-8 hover:bg-blue-50 hover:border-blue-200"
                        aria-label={`View details for ${client.name}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => onEditClient(client)}
                        className="h-8 w-8 hover:bg-green-50 hover:border-green-200"
                        aria-label={`Edit ${client.name}`}
                      >
                        <FileEdit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onDeleteClient(client)}
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 hover:border-red-200"
                        aria-label={`Archive ${client.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>

                {expandedClientId === client._id && (
                  <TableRow>
                    <TableCell colSpan={8} className="p-0 border-t-0">
                      <div className="bg-gradient-to-br from-gray-50 to-blue-50/30 p-6 border-l-4 border-blue-500">
                        <div className="space-y-6">
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="text-xl font-bold text-gray-900">Client Details & Transaction History</h3>
                              <p className="text-sm text-gray-600 mt-1">Complete overview of {client.name}'s account</p>
                            </div>
                            <Button
                              onClick={() => onAddTransaction(client._id, client.name)}
                              disabled={addingTransaction || isSubmitting}
                              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Payment
                            </Button>
                          </div>
                          
                          {/* Financial Summary Card */}
                          <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
                            <h4 className="text-lg font-semibold text-gray-900 mb-3">Financial Summary</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="text-center p-3 bg-blue-50 rounded-lg">
                                <div className="text-2xl font-bold text-blue-600">{formatCurrency(client.contractAmount)}</div>
                                <div className="text-sm text-gray-600">Total Contract</div>
                              </div>
                              <div className="text-center p-3 bg-green-50 rounded-lg">
                                <div className="text-2xl font-bold text-green-600">
                                  {formatCurrency(client.contractAmount - client.dueAmount)}
                                </div>
                                <div className="text-sm text-gray-600">Amount Paid</div>
                              </div>
                              <div className="text-center p-3 bg-orange-50 rounded-lg">
                                <div className={`text-2xl font-bold ${
                                  client.dueAmount > 0 ? 'text-orange-600' : 'text-green-600'
                                }`}>
                                  {formatCurrency(client.dueAmount)}
                                </div>
                                <div className="text-sm text-gray-600">Outstanding Balance</div>
                              </div>
                            </div>
                            <div className="mt-4">
                              <div className="flex justify-between text-sm text-gray-600 mb-2">
                                <span>Payment Progress</span>
                                <span>{Math.round(calculatePaymentProgress(client.contractAmount, client.dueAmount))}% Complete</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-3">
                                <div 
                                  className={`h-3 rounded-full transition-all duration-500 ${
                                    calculatePaymentProgress(client.contractAmount, client.dueAmount) === 100 
                                      ? 'bg-gradient-to-r from-green-500 to-green-600' 
                                      : calculatePaymentProgress(client.contractAmount, client.dueAmount) > 50 
                                      ? 'bg-gradient-to-r from-blue-500 to-blue-600' 
                                      : 'bg-gradient-to-r from-orange-500 to-orange-600'
                                  }`}
                                  style={{ width: `${calculatePaymentProgress(client.contractAmount, client.dueAmount)}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Client Information Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white rounded-lg shadow-sm border p-4">
                              <h4 className="text-lg font-semibold text-gray-900 mb-3">Contact Information</h4>
                              <div className="space-y-3">
                                <div className="flex items-center space-x-3">
                                  <Mail className="h-4 w-4 text-gray-400" />
                                  <span className="text-gray-900">{client.email}</span>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <Phone className="h-4 w-4 text-gray-400" />
                                  <span className="text-gray-900">{client.phone}</span>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <FileText className="h-4 w-4 text-gray-400" />
                                  <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{client.passportNumber}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="bg-white rounded-lg shadow-sm border p-4">
                              <h4 className="text-lg font-semibold text-gray-900 mb-3">Travel Details</h4>
                              <div className="space-y-3">
                                <div className="flex items-center space-x-3">
                                  <MapPin className="h-4 w-4 text-gray-400" />
                                  <span className="text-gray-900">{client.destination}</span>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <Calendar className="h-4 w-4 text-gray-400" />
                                  <span className="text-gray-900">{client.visaType || 'Not specified'}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}