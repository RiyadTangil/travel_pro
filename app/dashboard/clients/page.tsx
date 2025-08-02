"use client"

import { DialogTrigger } from "@/components/ui/dialog"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  PlusCircle,
  Search,
  FileEdit,
  Eye,
  ChevronDown,
  ChevronUp,
  Loader2,
  Trash2,
  Edit,
  X,
  AlertTriangle,
  Archive,
  FileText,
} from "lucide-react"
import { ClientDetails } from "@/components/client-details"
import { useClients, type Client, type B2CClient, type B2BClient } from "@/hooks/use-clients"
import { useTransactions, type Transaction } from "@/hooks/use-transactions"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import Link from "next/link"

export default function ClientsPage() {
  const {
    clients,
    loading,
    error,
    pagination,
    fetchClients,
    createB2CClient,
    updateClient,
    deleteClient,
    getClientById,
  } = useClients()

  const {
    transactions,
    loading: transactionsLoading,
    error: transactionsError,
    fetchTransactionsForClient,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  } = useTransactions()

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false)
  const [addClientOpen, setAddClientOpen] = useState(false)
  const [editClientOpen, setEditClientOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [selectedClientType, setSelectedClientType] = useState("saudi-kuwait")
  const [selectedB2BClient, setSelectedB2BClient] = useState("none")
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null)
  const [addingTransaction, setAddingTransaction] = useState(false)

  // Confirmation dialogs
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Transaction deletion confirmation
  const [transactionDeleteConfirmOpen, setTransactionDeleteConfirmOpen] = useState(false)
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null)
  const [isDeletingTransaction, setIsDeletingTransaction] = useState(false)

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!addClientOpen && !editClientOpen) {
      resetForm()
    } else if (addClientOpen && !editingClient) {
      // Reset form when opening add modal (but not edit modal)
      resetForm()
    }
  }, [addClientOpen, editClientOpen, editingClient])

  // Form state for new transaction
  const [newTransaction, setNewTransaction] = useState<Omit<Transaction, "_id" | "createdAt" | "updatedAt">>({
    clientId: "",
    clientName: "",
    date: new Date().toISOString().split("T")[0],
    receivedAmount: 0,
    refundAmount: 0,
    notes: "",
    transactionType: "B2C",
  })

  // Form state for new B2C client
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    passportNumber: "",
    destination: "",
    visaType: "",
    clientType: "saudi-kuwait" as "saudi-kuwait" | "other-countries" | "omra-visa",
    associatedB2BId: "",
    status: "file-ready",
    contractAmount: "",
    initialPayment: "",
    notes: "",
  })

  // Get B2B clients for dropdown - filter all clients to get only B2B ones
  const allClients = clients || []
  const b2bClients = allClients.filter((client): client is B2BClient => client.clientCategory === "B2B")
  const b2cClients = allClients.filter((client): client is B2CClient => client.clientCategory === "B2C")
  const hasB2BClients = b2bClients.length > 0

  // Filter B2C clients for display based on search and status
  const filteredB2cClients = b2cClients.filter((client) => {
    const matchesSearch =
      !searchTerm ||
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.passportNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || client.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const getStatusesForClientType = (clientType: string) => {
    switch (clientType) {
      case "saudi-kuwait":
        return [
          { value: "file-ready", label: "File Ready" },
          { value: "medical", label: "Medical" },
          { value: "mofa", label: "MOFA" },
          { value: "visa-stamping", label: "Visa Stamping" },
          { value: "manpower", label: "Manpower" },
          { value: "flight-ticket", label: "Flight/Ticket" },
          { value: "completed", label: "Completed" },
        ]
      case "other-countries":
        return [
          { value: "manpower", label: "Manpower" },
          { value: "flight-ticket", label: "Flight/Ticket" },
          { value: "completed", label: "Completed" },
        ]
      case "omra-visa":
        return [
          { value: "file-ready", label: "File Ready" },
          { value: "fingerprint", label: "Fingerprint" },
          { value: "flight-ticket", label: "Flight/Ticket" },
          { value: "completed", label: "Completed" },
        ]
      default:
        return []
    }
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
      <Badge className={statusStyles[status] || "bg-gray-100 text-gray-800"}>{statusLabels[status] || status}</Badge>
    )
  }

  const getClientSourceBadge = (associatedB2BId: string | undefined) => {
    if (associatedB2BId) {
      const b2bClient = b2bClients.find((client) => client._id === associatedB2BId)
      return (
        <Badge className="bg-purple-100 text-purple-800">{b2bClient ? `via ${b2bClient.name}` : "B2B Referred"}</Badge>
      )
    }
    return <Badge className="bg-green-100 text-green-800">Direct Client</Badge>
  }

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} BDT`
  }

  const handleViewDetails = async (client: B2CClient) => {
    try {
      const freshClient = await getClientById(client._id, "B2C")
      setSelectedClient(freshClient)
      setViewDetailsOpen(true)
    } catch (error) {
      console.error("Error fetching client details:", error)
      setSelectedClient(client)
      setViewDetailsOpen(true)
    }
  }

  const handleEditClient = async (client: B2CClient) => {
    try {
      const freshClient = (await getClientById(client._id, "B2C")) as B2CClient
      setEditingClient(freshClient)

      setFormData({
        name: freshClient.name,
        email: freshClient.email,
        phone: freshClient.phone || "",
        address: freshClient.address || "",
        passportNumber: freshClient.passportNumber,
        destination: freshClient.destination,
        visaType: freshClient.visaType || "",
        clientType: freshClient.clientType,
        associatedB2BId: freshClient.associatedB2BId || "",
        status: freshClient.status,
        contractAmount: freshClient.contractAmount.toString(),
        initialPayment: (freshClient.contractAmount - freshClient.dueAmount).toString(),
        notes: freshClient.notes || "",
      })
      setSelectedClientType(freshClient.clientType)
      setSelectedB2BClient(freshClient.associatedB2BId || "none")
      setEditClientOpen(true)
    } catch (error) {
      console.error("Error fetching client for edit:", error)
    }
  }

  const handleDeleteClient = (client: B2CClient) => {
    setClientToDelete(client)
    
    // Check if this client has any transactions before showing the confirmation
    fetchTransactionsForClient(client._id).then(() => {
    setDeleteConfirmOpen(true)
    })
  }

  const confirmDeleteClient = async () => {
    if (!clientToDelete) return

    try {
      setIsDeleting(true)
      const result = await deleteClient(clientToDelete._id, "B2C")
      
      toast({
        title: "Client Archived",
        description: "The client has been successfully archived.",
      })

      setDeleteConfirmOpen(false)
      setClientToDelete(null)

      // Refresh client list
      fetchClients({
        page: pagination.page,
        search: searchTerm,
        status: statusFilter,
      })
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to archive client")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSearch = () => {
    fetchClients({
      page: 1,
      search: searchTerm,
      status: statusFilter,
    })
  }

  const handleFilterChange = (type: string, value: string) => {
    if (type === "status") {
      setStatusFilter(value)
    }

    fetchClients({
      page: 1,
      search: searchTerm,
      status: type === "status" ? value : statusFilter,
    })
  }

  const handlePageChange = (page: number) => {
    fetchClients({
      page,
      search: searchTerm,
      status: statusFilter,
    })
  }

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
      passportNumber: "",
      destination: "",
      visaType: "",
      clientType: "saudi-kuwait",
      associatedB2BId: "",
      status: "file-ready",
      contractAmount: "",
      initialPayment: "",
      notes: "",
    })
    setSelectedB2BClient("none")
    setSelectedClientType("saudi-kuwait")
    setEditingClient(null)
  }

  const handleSubmitClient = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError("")

    try {
      if (editingClient) {
        // For editing, exclude contract amount and initial payment
        const { contractAmount, initialPayment, ...editData } = formData
        const clientData = {
          ...editData,
          clientType: selectedClientType as "saudi-kuwait" | "other-countries" | "omra-visa",
          associatedB2BId: selectedB2BClient !== "none" ? selectedB2BClient : undefined,
        }
        await updateClient(editingClient._id, clientData, "B2C")
        setEditClientOpen(false)
      } else {
        // For creating new client, include all fields
        const clientData = {
          ...formData,
          contractAmount: Number.parseFloat(formData.contractAmount) || 0,
          dueAmount: Number.parseFloat(formData.contractAmount) - Number.parseFloat(formData.initialPayment) || 0,
          clientType: selectedClientType as "saudi-kuwait" | "other-countries" | "omra-visa",
          associatedB2BId: selectedB2BClient !== "none" ? selectedB2BClient : undefined,
        }
        await createB2CClient(clientData)
        setAddClientOpen(false)
      }

      await fetchClients({
        page: pagination.page,
        search: searchTerm,
        status: statusFilter,
      })
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleRowExpansion = (clientId: string) => {
    if (expandedClientId === clientId) {
      setExpandedClientId(null)
      setEditingTransactionId(null)
      setAddingTransaction(false)
    } else {
      setExpandedClientId(clientId)
      setEditingTransactionId(null)
      setAddingTransaction(false)
      fetchTransactionsForClient(clientId)
    }
  }

  const handleAddTransaction = (clientId: string, clientName: string) => {
    setAddingTransaction(true)
    setEditingTransactionId(null)
    setNewTransaction({
      date: new Date().toISOString().split("T")[0],
      receivedAmount: 0,
      refundAmount: 0,
      notes: "",
      clientId,
      clientName,
      transactionType: "B2C",
    })
  }

  const handleSaveNewTransaction = async () => {
    try {
      setIsSubmitting(true)
      await addTransaction(newTransaction)
      setAddingTransaction(false)
      setNewTransaction({
        clientId: "",
        clientName: "",
        date: new Date().toISOString().split("T")[0],
        receivedAmount: 0,
        refundAmount: 0,
        notes: "",
        transactionType: "B2C",
      })

      // Refresh client data to update due amounts
      await fetchClients({
        page: pagination.page,
        search: searchTerm,
        status: statusFilter,
      })
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to add transaction")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransactionId(transaction._id)
    setAddingTransaction(false)
  }

  const handleUpdateTransaction = async (transactionId: string, updatedData: Partial<Transaction>) => {
    try {
      setIsSubmitting(true)
      await updateTransaction(transactionId, updatedData)
      setEditingTransactionId(null)

      // Refresh client data to update due amounts
      await fetchClients({
        page: pagination.page,
        search: searchTerm,
        status: statusFilter,
      })
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to update transaction")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteTransaction = (transaction: Transaction) => {
    setTransactionToDelete(transaction)
    setTransactionDeleteConfirmOpen(true)
  }

  const confirmDeleteTransaction = async () => {
    if (!transactionToDelete) return

    try {
      setIsDeletingTransaction(true)
      await deleteTransaction(transactionToDelete._id)

      // Refresh client data to update due amounts
      await fetchClients({
        page: pagination.page,
        search: searchTerm,
        status: statusFilter,
      })

      setTransactionDeleteConfirmOpen(false)
      setTransactionToDelete(null)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to delete transaction")
    } finally {
      setIsDeletingTransaction(false)
    }
  }

  // Search on Enter key
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm !== "") {
        handleSearch()
      } else {
        fetchClients({
          page: 1,
          status: statusFilter,
        })
      }
    }, 500)

    return () => clearTimeout(delayedSearch)
  }, [searchTerm])

  // Initial load - fetch all clients but display only B2C
  useEffect(() => {
    fetchClients({
      page: 1,
    })
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Client Management</h1>
          <p className="text-muted-foreground">Manage your B2C clients and their visa processing status</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/archived-clients">
              <Archive className="mr-2 h-4 w-4" />
              Archived Clients
            </Link>
          </Button>
          
          <Button variant="outline" asChild>
            <Link href="/dashboard/reports">
              <FileText className="mr-2 h-4 w-4" />
              Generate Report
            </Link>
          </Button>

        {/* Add New B2C Client Button */}
        <Dialog open={addClientOpen} onOpenChange={setAddClientOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add New Client
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
              <DialogDescription>Enter the client details to create a new B2C client record</DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto">
              <form onSubmit={handleSubmitClient}>
                <div className="grid gap-4 py-4 px-1">
                  {submitError && (
                    <Alert className="border-red-200 bg-red-50">
                      <AlertDescription className="text-red-800">{submitError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        placeholder="+1 234 567 890"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="passport">Passport Number *</Label>
                      <Input
                        id="passport"
                        placeholder="A12345678"
                        value={formData.passportNumber}
                        onChange={(e) => setFormData({ ...formData, passportNumber: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      placeholder="123 Main Street, City, Country"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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
                      <Input
                        id="destination"
                        placeholder="Dubai, UAE"
                        value={formData.destination}
                        onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                        required
                      />
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
                        onChange={(e) => setFormData({ ...formData, visaType: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="contractAmount">Contract Amount (BDT) *</Label>
                      <Input
                        id="contractAmount"
                        type="number"
                        placeholder="0"
                        value={formData.contractAmount}
                        onChange={(e) => setFormData({ ...formData, contractAmount: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="initialPayment">Initial Payment (BDT) *</Label>
                      <Input
                        id="initialPayment"
                        type="number"
                        placeholder="0"
                        value={formData.initialPayment}
                        onChange={(e) => setFormData({ ...formData, initialPayment: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Enter any additional information about the client"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter className="sticky bottom-0 bg-white pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setAddClientOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Save Client"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </div>
          </DialogContent>
        </Dialog>
        </div>

        {/* Edit Client Dialog */}
        <Dialog open={editClientOpen} onOpenChange={setEditClientOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Edit Client</DialogTitle>
              <DialogDescription>Update the client details</DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto">
              <form onSubmit={handleSubmitClient}>
                <div className="grid gap-4 py-4 px-1">
                  {submitError && (
                    <Alert className="border-red-200 bg-red-50">
                      <AlertDescription className="text-red-800">{submitError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="editName">Full Name *</Label>
                      <Input
                        id="editName"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editPhone">Phone Number *</Label>
                      <Input
                        id="editPhone"
                        placeholder="+1 234 567 890"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="editEmail">Email *</Label>
                      <Input
                        id="editEmail"
                        type="email"
                        placeholder="john@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editPassport">Passport Number *</Label>
                      <Input
                        id="editPassport"
                        placeholder="A12345678"
                        value={formData.passportNumber}
                        onChange={(e) => setFormData({ ...formData, passportNumber: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editAddress">Address</Label>
                    <Input
                      id="editAddress"
                      placeholder="123 Main Street, City, Country"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>

                  {hasB2BClients && (
                    <div className="space-y-2">
                      <Label htmlFor="editB2bClient">Referred by B2B Client (optional)</Label>
                      <Select value={selectedB2BClient} onValueChange={setSelectedB2BClient}>
                        <SelectTrigger id="editB2bClient">
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
                      <Label htmlFor="editDestination">Destination *</Label>
                      <Input
                        id="editDestination"
                        placeholder="Dubai, UAE"
                        value={formData.destination}
                        onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editClientType">Client Type</Label>
                      <Select value={selectedClientType} onValueChange={setSelectedClientType}>
                        <SelectTrigger id="editClientType">
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
                      <Label htmlFor="editStatus">Current Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData({ ...formData, status: value })}
                      >
                        <SelectTrigger id="editStatus">
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
                      <Label htmlFor="editVisaType">Visa Type</Label>
                      <Input
                        id="editVisaType"
                        placeholder="Work Visa, Tourist Visa, etc."
                        value={formData.visaType}
                        onChange={(e) => setFormData({ ...formData, visaType: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="editContractAmount">Contract Amount (BDT) *</Label>
                      <Input
                        id="editContractAmount"
                        type="number"
                        placeholder="0"
                        value={formData.contractAmount}
                        disabled
                        className="bg-gray-50 text-gray-600 cursor-not-allowed"
                      />
                      <p className="text-xs text-gray-500">Contract amount cannot be modified after creation</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editInitialPayment">Initial Payment (BDT) *</Label>
                      <Input
                        id="editInitialPayment"
                        type="number"
                        placeholder="0"
                        value={formData.initialPayment}
                        disabled
                        className="bg-gray-50 text-gray-600 cursor-not-allowed"
                      />
                      <p className="text-xs text-gray-500">Initial payment cannot be modified after creation</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editNotes">Additional Notes</Label>
                    <Textarea
                      id="editNotes"
                      placeholder="Enter any additional information about the client"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter className="sticky bottom-0 bg-white pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setEditClientOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update Client"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete/Archive Confirmation Dialog */}
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Archive This Client?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>
                  This client will be archived and hidden from the main view. You can still access archived clients later 
                  if needed.
                </p>
                {transactions.length > 0 && (
                  <Alert className="mt-2 border-amber-200 bg-amber-50">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mr-2" />
                    <AlertDescription className="text-amber-800">
                      This client has {transactions.length} transaction record{transactions.length > 1 ? 's' : ''}. 
                      These records will remain in the system but will be hidden along with the client.
                    </AlertDescription>
                  </Alert>
                )}
                <p className="font-medium mt-2">
                  Client: <span className="font-bold">{clientToDelete?.name}</span>
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteClient}
                disabled={isDeleting}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Archiving...
                  </>
                ) : (
                  "Archive Client"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Transaction Deletion Confirmation Dialog */}
        <AlertDialog open={transactionDeleteConfirmOpen} onOpenChange={setTransactionDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete This Transaction?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>
                  This transaction will be permanently deleted from the system. This action cannot be undone.
                </p>
                {transactionToDelete && (
                  <div className="mt-4 p-3 border rounded-md bg-gray-50">
                    <p className="font-medium">Transaction Details:</p>
                    <p className="text-sm text-gray-600">Date: {transactionToDelete.date}</p>
                    <p className="text-sm text-gray-600">
                      Received Amount: {formatCurrency(transactionToDelete.receivedAmount)}
                    </p>
                    {transactionToDelete.refundAmount > 0 && (
                      <p className="text-sm text-gray-600">
                        Refund Amount: {formatCurrency(transactionToDelete.refundAmount)}
                      </p>
                    )}
                    {transactionToDelete.notes && (
                      <p className="text-sm text-gray-600">Notes: {transactionToDelete.notes}</p>
                    )}
                  </div>
                )}
                <Alert className="mt-2 border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                  <AlertDescription className="text-red-800">
                    Deleting this transaction will affect the client's due amount calculation.
                  </AlertDescription>
                </Alert>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingTransaction}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteTransaction}
                disabled={isDeletingTransaction}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeletingTransaction ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Transaction"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name or passport..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <div className="w-full md:w-48">
            <Select value={statusFilter} onValueChange={(value) => handleFilterChange("status", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="file-ready">File Ready</SelectItem>
                <SelectItem value="medical">Medical</SelectItem>
                <SelectItem value="mofa">MOFA</SelectItem>
                <SelectItem value="visa-stamping">Visa Stamping</SelectItem>
                <SelectItem value="fingerprint">Fingerprint</SelectItem>
                <SelectItem value="manpower">Manpower</SelectItem>
                <SelectItem value="flight-ticket">Flight/Ticket</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Passport</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Contract Amount</TableHead>
              <TableHead>Due Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  <p className="mt-2 text-muted-foreground">Loading clients...</p>
                </TableCell>
              </TableRow>
            ) : filteredB2cClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <p className="text-muted-foreground">No clients found</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredB2cClients.map((client) => (
                <>
                  <TableRow key={client._id} className="hover:bg-gray-50">
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleRowExpansion(client._id)}
                        className="h-8 w-8"
                      >
                        {expandedClientId === client._id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>{getClientSourceBadge(client.associatedB2BId)}</TableCell>
                    <TableCell>{client.passportNumber}</TableCell>
                    <TableCell>{client.destination}</TableCell>
                    <TableCell>{getStatusBadge(client.status)}</TableCell>
                    <TableCell>{formatCurrency(client.contractAmount)}</TableCell>
                    <TableCell>{formatCurrency(client.dueAmount)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="icon" onClick={() => handleViewDetails(client)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => handleEditClient(client)}>
                          <FileEdit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDeleteClient(client)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>

                  {expandedClientId === client._id && (
                    <TableRow>
                      <TableCell colSpan={9} className="p-0 border-t-0">
                        <Card className="mx-2 mb-4 border-t-0 rounded-t-none shadow-sm">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-center mb-4">
                              <h3 className="text-lg font-semibold">Transaction History</h3>
                              <Button
                                size="sm"
                                onClick={() => handleAddTransaction(client._id, client.name)}
                                disabled={addingTransaction || isSubmitting}
                              >
                                <PlusCircle className="h-4 w-4 mr-1" /> Add Transaction
                              </Button>
                            </div>

                            {addingTransaction && (
                              <div className="mb-6 p-4 border rounded-md bg-gray-50">
                                <div className="flex justify-between items-center mb-3">
                                  <h4 className="font-medium">New Transaction</h4>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => setAddingTransaction(false)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                                  <div className="space-y-1">
                                    <Label htmlFor="new-date">Date</Label>
                                    <Input
                                      id="new-date"
                                      type="date"
                                      value={newTransaction.date}
                                      onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label htmlFor="new-received-amount">Received Amount (BDT)</Label>
                                    <Input
                                      id="new-received-amount"
                                      type="number"
                                      value={newTransaction.receivedAmount}
                                      onChange={(e) =>
                                        setNewTransaction({
                                          ...newTransaction,
                                          receivedAmount: Number.parseFloat(e.target.value) || 0,
                                        })
                                      }
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label htmlFor="new-refund-amount">Refund Amount (BDT)</Label>
                                    <Input
                                      id="new-refund-amount"
                                      type="number"
                                      value={newTransaction.refundAmount || 0}
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
                                  <Label htmlFor="new-notes">Notes</Label>
                                  <Textarea
                                    id="new-notes"
                                    placeholder="Additional details about this transaction"
                                    value={newTransaction.notes}
                                    onChange={(e) => setNewTransaction({ ...newTransaction, notes: e.target.value })}
                                  />
                                </div>
                                <div className="flex justify-end">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="mr-2"
                                    onClick={() => setAddingTransaction(false)}
                                  >
                                    Cancel
                                  </Button>
                                  <Button size="sm" onClick={handleSaveNewTransaction} disabled={isSubmitting}>
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

                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Received Amount</TableHead>
                                    <TableHead>Refund Amount</TableHead>
                                    <TableHead>Notes</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
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
                                    transactions.map((transaction) => (
                                      <TableRow key={transaction._id}>
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
                                          // View mode
                                          <>
                                            <TableCell>{transaction.date}</TableCell>
                                            <TableCell>{formatCurrency(transaction.receivedAmount)}</TableCell>
                                            <TableCell>{formatCurrency(transaction.refundAmount || 0)}</TableCell>
                                            <TableCell>{transaction.notes}</TableCell>
                                            <TableCell className="text-right">
                                              <div className="flex justify-end gap-2">
                                                {/* Edit button hidden as requested */}
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                  onClick={() => handleDeleteTransaction(transaction)}
                                                  disabled={isDeletingTransaction}
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
                          </CardContent>
                        </Card>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination.pages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => pagination.page > 1 && handlePageChange(pagination.page - 1)}
                className={pagination.page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
              const page = i + 1
              return (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => handlePageChange(page)}
                    isActive={pagination.page === page}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              )
            })}
            <PaginationItem>
              <PaginationNext
                onClick={() => pagination.page < pagination.pages && handlePageChange(pagination.page + 1)}
                className={pagination.page >= pagination.pages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {selectedClient && (
        <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>Client Details</DialogTitle>
            </DialogHeader>
            <ClientDetails client={selectedClient} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
