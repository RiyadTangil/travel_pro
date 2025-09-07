"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PlusCircle, RefreshCw } from "lucide-react"
import { useClients, type Client, type B2CClient, type B2BClient } from "@/hooks/use-clients"
import { useTransactions, type Transaction } from "@/hooks/use-transactions"
import { toast } from "@/components/ui/use-toast"

// Import our new components
import { NetworkErrorAlert } from "@/components/clients/network-error-alert"
import { ClientSearchFilter } from "@/components/clients/client-search-filter"
import { ClientTable } from "@/components/clients/client-table"
import { ClientFormDialog, type ClientFormData } from "@/components/clients/client-form-dialog"
import { ConfirmationDialog } from "@/components/clients/confirmation-dialog"
import { TransactionForm, type TransactionFormData } from "@/components/clients/transaction-form"
import { TransactionList } from "@/components/clients/transaction-list"

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
  const [networkError, setNetworkError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)

  // Retry mechanism for network errors
  const retryOperation = async (operation: () => Promise<void>, operationName: string) => {
    if (retryCount >= 3) {
      toast({
        title: "Maximum Retries Reached",
        description: `Failed to ${operationName} after 3 attempts. Please try again later.`,
        variant: "destructive",
      })
      return
    }

    try {
      setIsRetrying(true)
      setRetryCount(prev => prev + 1)
      await operation()
      setRetryCount(0)
      setNetworkError(null)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Failed to ${operationName}`
      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        toast({
          title: "Retry Failed",
          description: `Attempt ${retryCount + 1}/3 failed. ${retryCount < 2 ? 'Trying again...' : 'Please check your connection.'}`,
          variant: "destructive",
        })
        if (retryCount < 2) {
          setTimeout(() => retryOperation(operation, operationName), 2000)
        }
      }
    } finally {
      setIsRetrying(false)
    }
  }

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

  // Transaction form validation
  const [transactionErrors, setTransactionErrors] = useState<Record<string, string>>({})

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

  // Form validation errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [fieldValidationStatus, setFieldValidationStatus] = useState<Record<string, 'valid' | 'invalid' | 'pending'>>({})
  const [isDuplicateCheck, setIsDuplicateCheck] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  // Auto-save functionality
  const AUTO_SAVE_KEY = 'b2c_client_form_draft'
  
  // Load saved draft on component mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(AUTO_SAVE_KEY)
    if (savedDraft && !editingClient) {
      try {
        const parsedDraft = JSON.parse(savedDraft)
        // Only load if it's not empty
        const hasData = Object.values(parsedDraft).some(value => 
          value !== "" && value !== "saudi-kuwait" && value !== "file-ready"
        )
        if (hasData) {
          setFormData(parsedDraft)
          toast({
            title: "Draft Restored",
            description: "Your previous form data has been restored.",
          })
        }
      } catch (error) {
        console.error('Failed to load saved draft:', error)
      }
    }
  }, [editingClient])

  // Auto-save form data
  useEffect(() => {
    if (!editingClient && addClientOpen) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(formData))
      }, 1000) // Save after 1 second of inactivity
      
      return () => clearTimeout(timeoutId)
    }
  }, [formData, editingClient, addClientOpen])

  // Clear auto-save on successful submission
  const clearAutoSave = () => {
    localStorage.removeItem(AUTO_SAVE_KEY)
  }

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

  const handleViewDetails = async (client: B2CClient) => {
    try {
      setNetworkError(null)
      const freshClient = await getClientById(client._id, "B2C")
      setSelectedClient(freshClient)
      setViewDetailsOpen(true)
    } catch (error) {
      console.error("Error fetching client details:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch client details"
      
      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        setNetworkError("Network error occurred. Please check your connection and try again.")
        toast({
          title: "Connection Error",
          description: "Unable to fetch latest client data. Showing cached information.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
      }
      
      // Show cached client data as fallback
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
      setSubmitError("")
      setNetworkError(null)
      
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
      const errorMessage = error instanceof Error ? error.message : "Failed to archive client"
      
      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        setNetworkError("Network error occurred. Please check your connection and try again.")
        toast({
          title: "Connection Error",
          description: "Unable to archive client. Please check your connection and try again.",
          variant: "destructive",
        })
      } else if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
        setSubmitError("You don't have permission to archive this client.")
        toast({
          title: "Permission Error",
          description: "You don't have permission to archive this client.",
          variant: "destructive",
        })
      } else {
        setSubmitError(errorMessage)
        toast({
          title: "Archive Failed",
          description: errorMessage,
          variant: "destructive",
        })
      }
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
    setFormErrors({})
    setSubmitError("")
    clearAutoSave()
  }

  // Validation functions
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^[+]?[1-9]?[0-9]{7,15}$/
    return phoneRegex.test(phone.replace(/[\s-()]/g, ''))
  }

  const validatePassport = (passport: string): boolean => {
    const passportRegex = /^[A-Z0-9]{6,12}$/i
    return passportRegex.test(passport)
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.name.trim()) {
      errors.name = "Full name is required"
    } else if (formData.name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters"
    }

    if (!formData.email.trim()) {
      errors.email = "Email is required"
    } else if (!validateEmail(formData.email)) {
      errors.email = "Please enter a valid email address"
    }

    if (!formData.phone.trim()) {
      errors.phone = "Phone number is required"
    } else if (!validatePhone(formData.phone)) {
      errors.phone = "Please enter a valid phone number"
    }

    if (!formData.passportNumber.trim()) {
      errors.passportNumber = "Passport number is required"
    } else if (!validatePassport(formData.passportNumber)) {
      errors.passportNumber = "Passport number must be 6-12 alphanumeric characters"
    }

    if (!formData.destination.trim()) {
      errors.destination = "Destination is required"
    }

    if (!formData.contractAmount || Number.parseFloat(formData.contractAmount) <= 0) {
      errors.contractAmount = "Contract amount must be greater than 0"
    }

    if (!formData.initialPayment || Number.parseFloat(formData.initialPayment) < 0) {
      errors.initialPayment = "Initial payment cannot be negative"
    }

    if (Number.parseFloat(formData.initialPayment) > Number.parseFloat(formData.contractAmount)) {
      errors.initialPayment = "Initial payment cannot exceed contract amount"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Check for duplicate clients
  const checkDuplicateClient = async (): Promise<boolean> => {
    setIsDuplicateCheck(true)
    try {
      const duplicates = b2cClients.filter(client => 
        client._id !== editingClient?._id && (
          client.email.toLowerCase() === formData.email.toLowerCase() ||
          client.phone === formData.phone ||
          client.passportNumber.toLowerCase() === formData.passportNumber.toLowerCase()
        )
      )

      if (duplicates.length > 0) {
        const duplicate = duplicates[0]
        let duplicateField = ""
        if (duplicate.email.toLowerCase() === formData.email.toLowerCase()) duplicateField = "email"
        else if (duplicate.phone === formData.phone) duplicateField = "phone number"
        else if (duplicate.passportNumber.toLowerCase() === formData.passportNumber.toLowerCase()) duplicateField = "passport number"
        
        setSubmitError(`A client with this ${duplicateField} already exists: ${duplicate.name}`)
        return false
      }
      return true
    } finally {
      setIsDuplicateCheck(false)
    }
  }

  const handleSubmitClient = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError("")

    // Validate form
    if (!validateForm()) {
      return
    }

    // Check for duplicates
    if (!editingClient && !(await checkDuplicateClient())) {
      return
    }

    // Show confirmation dialog
    setShowConfirmDialog(true)
  }

  const handleConfirmSubmit = async () => {
    setIsSubmitting(true)
    setShowConfirmDialog(false)

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
        toast({
          title: "Success",
          description: "Client updated successfully",
        })
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
        clearAutoSave()
        setAddClientOpen(false)
        toast({
          title: "Success",
          description: "Client created successfully",
        })
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

  // Handle field changes with real-time validation
  const handleFieldChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value })
    
    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors({ ...formErrors, [field]: "" })
    }
    
    // Real-time validation for immediate feedback
    validateFieldRealTime(field, value)
  }

  const validateFieldRealTime = (field: string, value: string) => {
    let isValid = false
    
    switch (field) {
      case 'name':
        isValid = value.trim().length >= 2
        break
      case 'email':
        isValid = value === '' || validateEmail(value)
        break
      case 'phone':
        isValid = value === '' || validatePhone(value)
        break
      case 'passportNumber':
        isValid = value === '' || validatePassport(value)
        break
      case 'destination':
        isValid = value.trim().length >= 2
        break
      case 'contractAmount':
        isValid = value !== '' && !isNaN(Number(value)) && Number(value) > 0
        break
      case 'initialPayment':
        const contractAmount = Number(formData.contractAmount)
        const payment = Number(value)
        isValid = value !== '' && !isNaN(payment) && payment >= 0 && (contractAmount === 0 || payment <= contractAmount)
        break
      default:
        isValid = true
    }
    
    setFieldValidationStatus(prev => ({
      ...prev,
      [field]: isValid ? 'valid' : 'invalid'
    }))
  }

  const getFieldClassName = (field: string) => {
    if (formErrors[field]) {
      return "border-red-500 focus:border-red-500"
    }
    if (fieldValidationStatus[field] === 'valid') {
      return "border-green-500 focus:border-green-500"
    }
    return ""
  }

  const getFieldIcon = (field: string) => {
    if (formErrors[field]) {
      return <AlertTriangle className="h-4 w-4 text-red-500" />
    }
    if (fieldValidationStatus[field] === 'valid') {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />
    }
    return null
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

  const validateTransactionForm = (): boolean => {
    const errors: Record<string, string> = {}

    // Validate date
    if (!newTransaction.date) {
      errors.date = "Date is required"
    } else {
      const transactionDate = new Date(newTransaction.date)
      const today = new Date()
      today.setHours(23, 59, 59, 999) // Set to end of today
      if (transactionDate > today) {
        errors.date = "Transaction date cannot be in the future"
      }
    }

    // Validate received amount
    if (newTransaction.receivedAmount <= 0) {
      errors.receivedAmount = "Received amount must be greater than 0"
    }

    // Validate refund amount
    if (newTransaction.refundAmount < 0) {
      errors.refundAmount = "Refund amount cannot be negative"
    }

    // Check if refund amount exceeds received amount
    if (newTransaction.refundAmount > newTransaction.receivedAmount) {
      errors.refundAmount = "Refund amount cannot exceed received amount"
    }

    setTransactionErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSaveNewTransaction = async () => {
    if (!validateTransactionForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form before submitting.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)
      setSubmitError("")
      setNetworkError(null)
      
      await addTransaction(newTransaction)
      
      // Success feedback
      toast({
        title: "Transaction Added",
        description: "Transaction has been successfully added to the client's record.",
      })
      
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
      setTransactionErrors({})

      // Refresh client data to update due amounts
      await fetchClients({
        page: pagination.page,
        search: searchTerm,
        status: statusFilter,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to add transaction"
      
      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        setNetworkError("Network error occurred. Please check your connection and try again.")
        toast({
          title: "Connection Error",
          description: "Unable to save transaction. Please check your connection and try again.",
          variant: "destructive",
        })
      } else if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
        toast({
          title: "Validation Error",
          description: "Transaction data is invalid. Please check your inputs and try again.",
          variant: "destructive",
        })
      } else if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
        toast({
          title: "Permission Error",
          description: "You don't have permission to add transactions for this client.",
          variant: "destructive",
        })
      } else {
        setSubmitError(errorMessage)
        toast({
          title: "Transaction Failed",
          description: errorMessage,
          variant: "destructive",
        })
      }
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
      setNetworkError(null)
      
      await updateTransaction(transactionId, updatedData)
      
      toast({
        title: "Transaction Updated",
        description: "Transaction has been successfully updated.",
      })
      
      setEditingTransactionId(null)

      // Refresh client data to update due amounts
      await fetchClients({
        page: pagination.page,
        search: searchTerm,
        status: statusFilter,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update transaction"
      
      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        setNetworkError("Network error occurred. Please check your connection and try again.")
        toast({
          title: "Connection Error",
          description: "Unable to update transaction. Please check your connection and try again.",
          variant: "destructive",
        })
      } else if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
        toast({
          title: "Permission Error",
          description: "You don't have permission to update this transaction.",
          variant: "destructive",
        })
      } else {
        setSubmitError(errorMessage)
        toast({
          title: "Update Failed",
          description: errorMessage,
          variant: "destructive",
        })
      }
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
      setNetworkError(null)
      
      await deleteTransaction(transactionToDelete._id)
      
      toast({
        title: "Transaction Deleted",
        description: "Transaction has been successfully deleted.",
      })

      // Refresh client data to update due amounts
      await fetchClients({
        page: pagination.page,
        search: searchTerm,
        status: statusFilter,
      })

      setTransactionDeleteConfirmOpen(false)
      setTransactionToDelete(null)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete transaction"
      
      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        setNetworkError("Network error occurred. Please check your connection and try again.")
        toast({
          title: "Connection Error",
          description: "Unable to delete transaction. Please check your connection and try again.",
          variant: "destructive",
        })
      } else if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
        toast({
          title: "Permission Error",
          description: "You don't have permission to delete this transaction.",
          variant: "destructive",
        })
      } else {
        setSubmitError(errorMessage)
        toast({
          title: "Delete Failed",
          description: errorMessage,
          variant: "destructive",
        })
      }
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

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {editingClient ? "Confirm Client Update" : "Confirm Client Creation"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Please review the client information before {editingClient ? "updating" : "creating"}:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><strong>Name:</strong> {formData.name}</div>
              <div><strong>Email:</strong> {formData.email}</div>
              <div><strong>Phone:</strong> {formData.phone}</div>
              <div><strong>Passport:</strong> {formData.passportNumber}</div>
              <div><strong>Destination:</strong> {formData.destination}</div>
              <div><strong>Client Type:</strong> {selectedClientType === "saudi-kuwait" ? "Saudi & Kuwait" : selectedClientType === "other-countries" ? "Other Countries" : "Omra Visa"}</div>
              {!editingClient && (
                <>
                  <div><strong>Contract Amount:</strong> {formData.contractAmount} BDT</div>
                  <div><strong>Initial Payment:</strong> {formData.initialPayment} BDT</div>
                  <div><strong>Due Amount:</strong> {(Number.parseFloat(formData.contractAmount) - Number.parseFloat(formData.initialPayment)).toFixed(2)} BDT</div>
                </>
              )}
            </div>
            {formData.notes && (
              <div className="text-sm">
                <strong>Notes:</strong> {formData.notes}
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editingClient ? "Updating..." : "Creating..."}
                </>
              ) : (
                editingClient ? "Update Client" : "Create Client"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transaction Delete Confirmation Dialog */}
      <AlertDialog open={transactionDeleteConfirmOpen} onOpenChange={setTransactionDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Confirm Transaction Deletion
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone and will affect the client's payment history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {transactionToDelete && (
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>Date:</strong> {new Date(transactionToDelete.date).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</div>
                <div><strong>Amount:</strong> {formatCurrency(transactionToDelete.receivedAmount)}</div>
                {transactionToDelete.refundAmount && transactionToDelete.refundAmount > 0 && (
                  <div><strong>Refund:</strong> {formatCurrency(transactionToDelete.refundAmount)}</div>
                )}
                {transactionToDelete.notes && (
                  <div className="col-span-2"><strong>Notes:</strong> {transactionToDelete.notes}</div>
                )}
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteTransaction} 
              disabled={isDeletingTransaction}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
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
    </div>
    </div>
   
  )
}
