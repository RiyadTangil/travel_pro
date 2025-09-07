"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  Archive,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Edit,
  Eye,
  FileEdit,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  PlusCircle,
  RefreshCw,
  Search,
  Trash2,
  WifiOff,
  X,
} from "lucide-react";
import {
  useClients,
  type Client,
  type B2CClient,
  type B2BClient,
} from "@/hooks/use-clients";
import { useTransactions, type Transaction } from "@/hooks/use-transactions";
import { toast } from "@/components/ui/use-toast";

// Import our new components
import { NetworkErrorAlert } from "@/components/clients/network-error-alert";
import { ClientSearchFilter } from "@/components/clients/client-search-filter";
import { ClientTable } from "@/components/clients/client-table";
import {
  ClientFormDialog,
  type ClientFormData,
} from "@/components/clients/client-form-dialog";
import { ConfirmationDialog } from "@/components/clients/confirmation-dialog";
import {
  TransactionForm,
  type TransactionFormData,
} from "@/components/clients/transaction-form";
import { TransactionList } from "@/components/clients/transaction-list";
import Link from "next/link";
import { DialogTrigger } from "@radix-ui/react-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { ClientDetails } from "@/components/client-details";

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
  } = useClients();

  const {
    transactions,
    loading: transactionsLoading,
    error: transactionsError,
    fetchTransactionsForClient,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  } = useTransactions();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [editClientOpen, setEditClientOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClientType, setSelectedClientType] = useState("saudi-kuwait");
  const [selectedB2BClient, setSelectedB2BClient] = useState("none");
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [editingTransactionId, setEditingTransactionId] = useState<
    string | null
  >(null);
  const [addingTransaction, setAddingTransaction] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  // Confirmation dialogs
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Transaction deletion confirmation
  const [transactionDeleteConfirmOpen, setTransactionDeleteConfirmOpen] =
    useState(false);
  const [transactionToDelete, setTransactionToDelete] =
    useState<Transaction | null>(null);
  const [isDeletingTransaction, setIsDeletingTransaction] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  // Retry mechanism for network errors
  const retryOperation = async (
    operation: () => Promise<void>,
    operationName: string
  ) => {
    if (retryCount >= 3) {
      toast({
        title: "Maximum Retries Reached",
        description: `Failed to ${operationName} after 3 attempts. Please try again later.`,
        variant: "destructive",
      });
      return;
    }

    try {
      setIsRetrying(true);
      setRetryCount((prev) => prev + 1);
      await operation();
      setRetryCount(0);
      setNetworkError(null);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : `Failed to ${operationName}`;
      if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
        toast({
          title: "Retry Failed",
          description: `Attempt ${retryCount + 1}/3 failed. ${
            retryCount < 2 ? "Trying again..." : "Please check your connection."
          }`,
          variant: "destructive",
        });
        if (retryCount < 2) {
          setTimeout(() => retryOperation(operation, operationName), 2000);
        }
      }
    } finally {
      setIsRetrying(false);
    }
  };

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!addClientOpen && !editClientOpen) {
      resetForm();
    } else if (addClientOpen && !editingClient) {
      // Reset form when opening add modal (but not edit modal)
      resetForm();
    }
  }, [addClientOpen, editClientOpen, editingClient]);

  // Form state for new transaction
  const [newTransaction, setNewTransaction] = useState<
    Omit<Transaction, "_id" | "createdAt" | "updatedAt">
  >({
    clientId: "",
    clientName: "",
    date: new Date().toISOString().split("T")[0],
    receivedAmount: 0,
    refundAmount: 0,
    notes: "",
    transactionType: "B2C",
  });

  // Transaction form validation
  const [transactionErrors, setTransactionErrors] = useState<
    Record<string, string>
  >({});

  // Form state for new B2C client
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    passportNumber: "",
    destination: "",
    visaType: "",
    clientType: "saudi-kuwait" as
      | "saudi-kuwait"
      | "other-countries"
      | "omra-visa",
    associatedB2BId: "",
    status: "file-ready",
    contractAmount: "",
    initialPayment: "",
    notes: "",
  });

  // Form validation errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [fieldValidationStatus, setFieldValidationStatus] = useState<
    Record<string, "valid" | "invalid" | "pending">
  >({});
  const [isDuplicateCheck, setIsDuplicateCheck] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Auto-save functionality
  const AUTO_SAVE_KEY = "b2c_client_form_draft";

  // Load saved draft on component mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(AUTO_SAVE_KEY);
    if (savedDraft && !editingClient) {
      try {
        const parsedDraft = JSON.parse(savedDraft);
        // Only load if it's not empty
        const hasData = Object.values(parsedDraft).some(
          (value) =>
            value !== "" && value !== "saudi-kuwait" && value !== "file-ready"
        );
        if (hasData) {
          setFormData(parsedDraft);
          toast({
            title: "Draft Restored",
            description: "Your previous form data has been restored.",
          });
        }
      } catch (error) {
        console.error("Failed to load saved draft:", error);
      }
    }
  }, [editingClient]);

  // Auto-save form data
  useEffect(() => {
    if (!editingClient && addClientOpen) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(formData));
      }, 1000); // Save after 1 second of inactivity

      return () => clearTimeout(timeoutId);
    }
  }, [formData, editingClient, addClientOpen]);

  // Clear auto-save on successful submission
  const clearAutoSave = () => {
    localStorage.removeItem(AUTO_SAVE_KEY);
  };

  // Get B2B clients for dropdown - filter all clients to get only B2B ones
  const allClients = clients || [];
  const b2bClients = allClients.filter(
    (client): client is B2BClient => client.clientCategory === "B2B"
  );
  const b2cClients = allClients.filter(
    (client): client is B2CClient => client.clientCategory === "B2C"
  );
  const hasB2BClients = b2bClients.length > 0;

  // Filter B2C clients for display based on search and status
  const filteredB2cClients = b2cClients.filter((client) => {
    const matchesSearch =
      !searchTerm ||
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.passportNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || client.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

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
        ];
      case "other-countries":
        return [
          { value: "manpower", label: "Manpower" },
          { value: "flight-ticket", label: "Flight/Ticket" },
          { value: "completed", label: "Completed" },
        ];
      case "omra-visa":
        return [
          { value: "file-ready", label: "File Ready" },
          { value: "fingerprint", label: "Fingerprint" },
          { value: "flight-ticket", label: "Flight/Ticket" },
          { value: "completed", label: "Completed" },
        ];
      default:
        return [];
    }
  };

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
    };

    const statusLabels = {
      "file-ready": "File Ready",
      medical: "Medical",
      mofa: "MOFA",
      "visa-stamping": "Visa Stamping",
      fingerprint: "Fingerprint",
      manpower: "Manpower",
      "flight-ticket": "Flight/Ticket",
      completed: "Completed",
    };

    return (
      <Badge className={statusStyles[status] || "bg-gray-100 text-gray-800"}>
        {statusLabels[status] || status}
      </Badge>
    );
  };

  const getClientSourceBadge = (associatedB2BId: string | undefined) => {
    if (associatedB2BId) {
      const b2bClient = b2bClients.find(
        (client) => client._id === associatedB2BId
      );
      return (
        <Badge className="bg-purple-100 text-purple-800">
          {b2bClient ? `via ${b2bClient.name}` : "B2B Referred"}
        </Badge>
      );
    }
    return <Badge className="bg-green-100 text-green-800">Direct Client</Badge>;
  };

  const formatCurrency = (amount: number) => {
    if (isNaN(amount) || amount === null || amount === undefined) {
      return "0 BDT";
    }
    return `${amount.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })} BDT`;
  };

  const formatCurrencyWithColor = (
    amount: number,
    isOverdue: boolean = false
  ) => {
    const formatted = formatCurrency(amount);
    const colorClass =
      amount > 0
        ? isOverdue
          ? "text-red-600 font-semibold"
          : "text-orange-600 font-medium"
        : "text-green-600";
    return { formatted, colorClass };
  };

  const calculatePaymentProgress = (
    contractAmount: number,
    dueAmount: number
  ) => {
    if (contractAmount <= 0) return 0;
    const paidAmount = contractAmount - dueAmount;
    return Math.max(0, Math.min(100, (paidAmount / contractAmount) * 100));
  };

  const handleViewDetails = async (client: B2CClient) => {
    try {
      setNetworkError(null);
      const freshClient = await getClientById(client._id, "B2C");
      setSelectedClient(freshClient);
      setViewDetailsOpen(true);
    } catch (error) {
      console.error("Error fetching client details:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to fetch client details";

      if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
        setNetworkError(
          "Network error occurred. Please check your connection and try again."
        );
        toast({
          title: "Connection Error",
          description:
            "Unable to fetch latest client data. Showing cached information.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }

      // Show cached client data as fallback
      setSelectedClient(client);
      setViewDetailsOpen(true);
    }
  };

  const handleEditClient = async (client: B2CClient) => {
    try {
      const freshClient = (await getClientById(client._id, "B2C")) as B2CClient;
      setEditingClient(freshClient);

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
        initialPayment: (
          freshClient.contractAmount - freshClient.dueAmount
        ).toString(),
        notes: freshClient.notes || "",
      });
      setSelectedClientType(freshClient.clientType);
      setSelectedB2BClient(freshClient.associatedB2BId || "none");
      setEditClientOpen(true);
    } catch (error) {
      console.error("Error fetching client for edit:", error);
    }
  };

  const handleDeleteClient = (client: B2CClient) => {
    setClientToDelete(client);

    // Check if this client has any transactions before showing the confirmation
    fetchTransactionsForClient(client._id).then(() => {
      setDeleteConfirmOpen(true);
    });
  };

  const confirmDeleteClient = async () => {
    if (!clientToDelete) return;

    try {
      setIsDeleting(true);
      setSubmitError("");
      setNetworkError(null);

      const result = await deleteClient(clientToDelete._id, "B2C");

      toast({
        title: "Client Archived",
        description: "The client has been successfully archived.",
      });

      setDeleteConfirmOpen(false);
      setClientToDelete(null);

      // Refresh client list
      fetchClients({
        page: pagination.page,
        search: searchTerm,
        status: statusFilter,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to archive client";

      if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
        setNetworkError(
          "Network error occurred. Please check your connection and try again."
        );
        toast({
          title: "Connection Error",
          description:
            "Unable to archive client. Please check your connection and try again.",
          variant: "destructive",
        });
      } else if (
        errorMessage.includes("permission") ||
        errorMessage.includes("unauthorized")
      ) {
        setSubmitError("You don't have permission to archive this client.");
        toast({
          title: "Permission Error",
          description: "You don't have permission to archive this client.",
          variant: "destructive",
        });
      } else {
        setSubmitError(errorMessage);
        toast({
          title: "Archive Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSearch = () => {
    fetchClients({
      page: 1,
      search: searchTerm,
      status: statusFilter,
    });
  };

  const handleFilterChange = (type: string, value: string) => {
    if (type === "status") {
      setStatusFilter(value);
    }

    fetchClients({
      page: 1,
      search: searchTerm,
      status: type === "status" ? value : statusFilter,
    });
  };

  const handlePageChange = (page: number) => {
    fetchClients({
      page,
      search: searchTerm,
      status: statusFilter,
    });
  };

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
    });
    setSelectedB2BClient("none");
    setSelectedClientType("saudi-kuwait");
    setEditingClient(null);
    setFormErrors({});
    setSubmitError("");
    clearAutoSave();
  };

  // Validation functions
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^[+]?[1-9]?[0-9]{7,15}$/;
    return phoneRegex.test(phone.replace(/[\s-()]/g, ""));
  };

  const validatePassport = (passport: string): boolean => {
    const passportRegex = /^[A-Z0-9]{6,12}$/i;
    return passportRegex.test(passport);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Full name is required";
    } else if (formData.name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters";
    }

    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      errors.email = "Please enter a valid email address";
    }

    if (!formData.phone.trim()) {
      errors.phone = "Phone number is required";
    } else if (!validatePhone(formData.phone)) {
      errors.phone = "Please enter a valid phone number";
    }

    if (!formData.passportNumber.trim()) {
      errors.passportNumber = "Passport number is required";
    } else if (!validatePassport(formData.passportNumber)) {
      errors.passportNumber =
        "Passport number must be 6-12 alphanumeric characters";
    }

    if (!formData.destination.trim()) {
      errors.destination = "Destination is required";
    }

    if (
      !formData.contractAmount ||
      Number.parseFloat(formData.contractAmount) <= 0
    ) {
      errors.contractAmount = "Contract amount must be greater than 0";
    }

    if (
      !formData.initialPayment ||
      Number.parseFloat(formData.initialPayment) < 0
    ) {
      errors.initialPayment = "Initial payment cannot be negative";
    }

    if (
      Number.parseFloat(formData.initialPayment) >
      Number.parseFloat(formData.contractAmount)
    ) {
      errors.initialPayment = "Initial payment cannot exceed contract amount";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Check for duplicate clients
  const checkDuplicateClient = async (): Promise<boolean> => {
    setIsDuplicateCheck(true);
    try {
      const duplicates = b2cClients.filter(
        (client) =>
          client._id !== editingClient?._id &&
          (client.email.toLowerCase() === formData.email.toLowerCase() ||
            client.phone === formData.phone ||
            client.passportNumber.toLowerCase() ===
              formData.passportNumber.toLowerCase())
      );

      if (duplicates.length > 0) {
        const duplicate = duplicates[0];
        let duplicateField = "";
        if (duplicate.email.toLowerCase() === formData.email.toLowerCase())
          duplicateField = "email";
        else if (duplicate.phone === formData.phone)
          duplicateField = "phone number";
        else if (
          duplicate.passportNumber.toLowerCase() ===
          formData.passportNumber.toLowerCase()
        )
          duplicateField = "passport number";

        setSubmitError(
          `A client with this ${duplicateField} already exists: ${duplicate.name}`
        );
        return false;
      }
      return true;
    } finally {
      setIsDuplicateCheck(false);
    }
  };

  const handleSubmitClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    // Validate form
    if (!validateForm()) {
      return;
    }

    // Check for duplicates
    if (!editingClient && !(await checkDuplicateClient())) {
      return;
    }

    // Show confirmation dialog
    setShowConfirmDialog(true);
  };

  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    setShowConfirmDialog(false);

    try {
      if (editingClient) {
        // For editing, exclude contract amount and initial payment
        const { contractAmount, initialPayment, ...editData } = formData;
        const clientData = {
          ...editData,
          clientType: selectedClientType as
            | "saudi-kuwait"
            | "other-countries"
            | "omra-visa",
          associatedB2BId:
            selectedB2BClient !== "none" ? selectedB2BClient : undefined,
        };
        await updateClient(editingClient._id, clientData, "B2C");
        setEditClientOpen(false);
        toast({
          title: "Success",
          description: "Client updated successfully",
        });
      } else {
        // For creating new client, include all fields
        const clientData = {
          ...formData,
          contractAmount: Number.parseFloat(formData.contractAmount) || 0,
          dueAmount:
            Number.parseFloat(formData.contractAmount) -
              Number.parseFloat(formData.initialPayment) || 0,
          clientType: selectedClientType as
            | "saudi-kuwait"
            | "other-countries"
            | "omra-visa",
          associatedB2BId:
            selectedB2BClient !== "none" ? selectedB2BClient : undefined,
        };
        await createB2CClient(clientData);
        clearAutoSave();
        setAddClientOpen(false);
        toast({
          title: "Success",
          description: "Client created successfully",
        });
      }

      await fetchClients({
        page: pagination.page,
        search: searchTerm,
        status: statusFilter,
      });
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "An error occurred"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle field changes with real-time validation
  const handleFieldChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });

    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors({ ...formErrors, [field]: "" });
    }

    // Real-time validation for immediate feedback
    validateFieldRealTime(field, value);
  };

  const validateFieldRealTime = (field: string, value: string) => {
    let isValid = false;

    switch (field) {
      case "name":
        isValid = value.trim().length >= 2;
        break;
      case "email":
        isValid = value === "" || validateEmail(value);
        break;
      case "phone":
        isValid = value === "" || validatePhone(value);
        break;
      case "passportNumber":
        isValid = value === "" || validatePassport(value);
        break;
      case "destination":
        isValid = value.trim().length >= 2;
        break;
      case "contractAmount":
        isValid = value !== "" && !isNaN(Number(value)) && Number(value) > 0;
        break;
      case "initialPayment":
        const contractAmount = Number(formData.contractAmount);
        const payment = Number(value);
        isValid =
          value !== "" &&
          !isNaN(payment) &&
          payment >= 0 &&
          (contractAmount === 0 || payment <= contractAmount);
        break;
      default:
        isValid = true;
    }

    setFieldValidationStatus((prev) => ({
      ...prev,
      [field]: isValid ? "valid" : "invalid",
    }));
  };

  const getFieldClassName = (field: string) => {
    if (formErrors[field]) {
      return "border-red-500 focus:border-red-500";
    }
    if (fieldValidationStatus[field] === "valid") {
      return "border-green-500 focus:border-green-500";
    }
    return "";
  };

  const getFieldIcon = (field: string) => {
    if (formErrors[field]) {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
    if (fieldValidationStatus[field] === "valid") {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
    return null;
  };

  const toggleRowExpansion = (clientId: string) => {
    if (expandedClientId === clientId) {
      setExpandedClientId(null);
      setEditingTransactionId(null);
      setAddingTransaction(false);
    } else {
      setExpandedClientId(clientId);
      setEditingTransactionId(null);
      setAddingTransaction(false);
      fetchTransactionsForClient(clientId);
    }
  };

  const handleAddTransaction = (clientId: string, clientName: string) => {
    setAddingTransaction(true);
    setEditingTransactionId(null);
    setNewTransaction({
      date: new Date().toISOString().split("T")[0],
      receivedAmount: 0,
      refundAmount: 0,
      notes: "",
      clientId,
      clientName,
      transactionType: "B2C",
    });
    setPaymentModalOpen(true);
  };

  const validateTransactionForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Validate date
    if (!newTransaction.date) {
      errors.date = "Date is required";
    } else {
      const transactionDate = new Date(newTransaction.date);
      const today = new Date();
      today.setHours(23, 59, 59, 999); // Set to end of today
      if (transactionDate > today) {
        errors.date = "Transaction date cannot be in the future";
      }
    }

    // Validate received amount
    if (newTransaction.receivedAmount <= 0) {
      errors.receivedAmount = "Received amount must be greater than 0";
    }

    // Validate refund amount
    if (newTransaction.refundAmount < 0) {
      errors.refundAmount = "Refund amount cannot be negative";
    }

    // Check if refund amount exceeds received amount
    if (newTransaction.refundAmount > newTransaction.receivedAmount) {
      errors.refundAmount = "Refund amount cannot exceed received amount";
    }

    setTransactionErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveNewTransaction = async () => {
    if (!validateTransactionForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form before submitting.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError("");
      setNetworkError(null);

      await addTransaction(newTransaction);

      // Success feedback
      toast({
        title: "Transaction Added",
        description:
          "Transaction has been successfully added to the client's record.",
      });

      setAddingTransaction(false);
      setNewTransaction({
        clientId: "",
        clientName: "",
        date: new Date().toISOString().split("T")[0],
        receivedAmount: 0,
        refundAmount: 0,
        notes: "",
        transactionType: "B2C",
      });
      setTransactionErrors({});

      // Refresh client data to update due amounts
      await fetchClients({
        page: pagination.page,
        search: searchTerm,
        status: statusFilter,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to add transaction";

      if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
        setNetworkError(
          "Network error occurred. Please check your connection and try again."
        );
        toast({
          title: "Connection Error",
          description:
            "Unable to save transaction. Please check your connection and try again.",
          variant: "destructive",
        });
      } else if (
        errorMessage.includes("validation") ||
        errorMessage.includes("invalid")
      ) {
        toast({
          title: "Validation Error",
          description:
            "Transaction data is invalid. Please check your inputs and try again.",
          variant: "destructive",
        });
      } else if (
        errorMessage.includes("permission") ||
        errorMessage.includes("unauthorized")
      ) {
        toast({
          title: "Permission Error",
          description:
            "You don't have permission to add transactions for this client.",
          variant: "destructive",
        });
      } else {
        setSubmitError(errorMessage);
        toast({
          title: "Transaction Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransactionId(transaction._id);
    setAddingTransaction(false);
  };

  const handleUpdateTransaction = async (
    transactionId: string,
    updatedData: Partial<Transaction>
  ) => {
    try {
      setIsSubmitting(true);
      setNetworkError(null);

      await updateTransaction(transactionId, updatedData);

      toast({
        title: "Transaction Updated",
        description: "Transaction has been successfully updated.",
      });

      setEditingTransactionId(null);

      // Refresh client data to update due amounts
      await fetchClients({
        page: pagination.page,
        search: searchTerm,
        status: statusFilter,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update transaction";

      if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
        setNetworkError(
          "Network error occurred. Please check your connection and try again."
        );
        toast({
          title: "Connection Error",
          description:
            "Unable to update transaction. Please check your connection and try again.",
          variant: "destructive",
        });
      } else if (
        errorMessage.includes("permission") ||
        errorMessage.includes("unauthorized")
      ) {
        toast({
          title: "Permission Error",
          description: "You don't have permission to update this transaction.",
          variant: "destructive",
        });
      } else {
        setSubmitError(errorMessage);
        toast({
          title: "Update Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTransaction = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setTransactionDeleteConfirmOpen(true);
  };

  const confirmDeleteTransaction = async () => {
    if (!transactionToDelete) return;

    try {
      setIsDeletingTransaction(true);
      setNetworkError(null);

      await deleteTransaction(transactionToDelete._id);

      toast({
        title: "Transaction Deleted",
        description: "Transaction has been successfully deleted.",
      });

      // Refresh client data to update due amounts
      await fetchClients({
        page: pagination.page,
        search: searchTerm,
        status: statusFilter,
      });

      setTransactionDeleteConfirmOpen(false);
      setTransactionToDelete(null);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete transaction";

      if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
        setNetworkError(
          "Network error occurred. Please check your connection and try again."
        );
        toast({
          title: "Connection Error",
          description:
            "Unable to delete transaction. Please check your connection and try again.",
          variant: "destructive",
        });
      } else if (
        errorMessage.includes("permission") ||
        errorMessage.includes("unauthorized")
      ) {
        toast({
          title: "Permission Error",
          description: "You don't have permission to delete this transaction.",
          variant: "destructive",
        });
      } else {
        setSubmitError(errorMessage);
        toast({
          title: "Delete Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsDeletingTransaction(false);
    }
  };

  // Search on Enter key
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm !== "") {
        handleSearch();
      } else {
        fetchClients({
          page: 1,
          status: statusFilter,
        });
      }
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm]);

  // Initial load - fetch all clients but display only B2C
  useEffect(() => {
    fetchClients({
      page: 1,
    });
  }, []);

  return (
    <div className="space-y-6">
      {networkError && (
        <Alert className="border-orange-200 bg-orange-50">
          <div className="flex items-center gap-2">
            <WifiOff className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800 flex-1">
              {networkError}
            </AlertDescription>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setNetworkError(null);
                setRetryCount(0);
                fetchClients({
                  page: pagination.page,
                  search: searchTerm,
                  status: statusFilter,
                });
              }}
              disabled={isRetrying}
              className="ml-2"
            >
              {isRetrying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {isRetrying ? "Retrying..." : "Retry"}
            </Button>
          </div>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Client Management
          </h1>
          <p className="text-muted-foreground">
            Manage your B2C clients and their visa processing status
          </p>
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
        </div>
      </div>
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
            <DialogDescription>
              Enter the client details to create a new B2C client record
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <form onSubmit={handleSubmitClient}>
              <div className="grid gap-4 py-4 px-1">
                {submitError && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertDescription className="text-red-800">
                      {submitError}
                    </AlertDescription>
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
                        onChange={(e) =>
                          handleFieldChange("name", e.target.value)
                        }
                        className={getFieldClassName("name")}
                        required
                        aria-describedby={
                          formErrors.name ? "name-error" : undefined
                        }
                      />
                      {formData.name && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          {getFieldIcon("name")}
                        </div>
                      )}
                    </div>
                    {formErrors.name && (
                      <p
                        id="name-error"
                        className="text-sm text-red-600 flex items-center gap-1"
                      >
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
                        onChange={(e) =>
                          handleFieldChange("phone", e.target.value)
                        }
                        className={getFieldClassName("phone")}
                        required
                        aria-describedby={
                          formErrors.phone ? "phone-error" : undefined
                        }
                      />
                      {formData.phone && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          {getFieldIcon("phone")}
                        </div>
                      )}
                    </div>
                    {formErrors.phone && (
                      <p
                        id="phone-error"
                        className="text-sm text-red-600 flex items-center gap-1"
                      >
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
                        onChange={(e) =>
                          handleFieldChange("email", e.target.value)
                        }
                        className={getFieldClassName("email")}
                        required
                        aria-describedby={
                          formErrors.email ? "email-error" : undefined
                        }
                      />
                      {formData.email && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          {getFieldIcon("email")}
                        </div>
                      )}
                    </div>
                    {formErrors.email && (
                      <p
                        id="email-error"
                        className="text-sm text-red-600 flex items-center gap-1"
                      >
                        <AlertTriangle className="h-3 w-3" />
                        {formErrors.email}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="passport">Passport Number *</Label>
                    <div className="relative">
                      <Input
                        id="passport"
                        placeholder="A12345678"
                        value={formData.passportNumber}
                        onChange={(e) =>
                          handleFieldChange(
                            "passportNumber",
                            e.target.value.toUpperCase()
                          )
                        }
                        className={getFieldClassName("passportNumber")}
                        required
                        aria-describedby={
                          formErrors.passportNumber
                            ? "passport-error"
                            : undefined
                        }
                      />
                      {formData.passportNumber && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          {getFieldIcon("passportNumber")}
                        </div>
                      )}
                    </div>
                    {formErrors.passportNumber && (
                      <p
                        id="passport-error"
                        className="text-sm text-red-600 flex items-center gap-1"
                      >
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
                    onChange={(e) =>
                      handleFieldChange("address", e.target.value)
                    }
                  />
                </div>
               
                exist
                {hasB2BClients && (
                  <div className="space-y-2">
                    <Label htmlFor="b2bClient">
                      Referred by B2B Client (optional)
                    </Label>
                    <Select
                      value={selectedB2BClient}
                      onValueChange={setSelectedB2BClient}
                    >
                      <SelectTrigger id="b2bClient">
                        <SelectValue placeholder="Select B2B client (if referred)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          Direct Client (No B2B Reference)
                        </SelectItem>
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
                        onChange={(e) =>
                          handleFieldChange("destination", e.target.value)
                        }
                        className={getFieldClassName("destination")}
                        required
                        aria-describedby={
                          formErrors.destination
                            ? "destination-error"
                            : undefined
                        }
                      />
                      {getFieldIcon("destination")}
                    </div>
                    {formErrors.destination && (
                      <p
                        id="destination-error"
                        className="text-sm text-red-600 flex items-center gap-1"
                      >
                        <AlertTriangle className="h-3 w-3" />
                        {formErrors.destination}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientType">Client Type</Label>
                    <Select
                      value={selectedClientType}
                      onValueChange={setSelectedClientType}
                    >
                      <SelectTrigger id="clientType">
                        <SelectValue placeholder="Select client type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="saudi-kuwait">
                          Saudi & Kuwait
                        </SelectItem>
                        <SelectItem value="other-countries">
                          Other Countries
                        </SelectItem>
                        <SelectItem value="omra-visa">
                          Omra Visa (Saudi)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">Current Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        setFormData({ ...formData, status: value })
                      }
                    >
                      <SelectTrigger id="status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {getStatusesForClientType(selectedClientType).map(
                          (status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="visaType">Visa Type</Label>
                    <Input
                      id="visaType"
                      placeholder="Work Visa, Tourist Visa, etc."
                      value={formData.visaType}
                      onChange={(e) =>
                        handleFieldChange("visaType", e.target.value)
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contractAmount">
                      Contract Amount (BDT) *
                    </Label>
                    <div className="relative">
                      <Input
                        id="contractAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.contractAmount}
                        onChange={(e) =>
                          handleFieldChange("contractAmount", e.target.value)
                        }
                        className={getFieldClassName("contractAmount")}
                        required
                        aria-describedby={
                          formErrors.contractAmount
                            ? "contract-error"
                            : undefined
                        }
                      />
                      {getFieldIcon("contractAmount")}
                    </div>
                    {formErrors.contractAmount && (
                      <p
                        id="contract-error"
                        className="text-sm text-red-600 flex items-center gap-1"
                      >
                        <AlertTriangle className="h-3 w-3" />
                        {formErrors.contractAmount}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="initialPayment">
                      Initial Payment (BDT) *
                    </Label>
                    <div className="relative">
                      <Input
                        id="initialPayment"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.initialPayment}
                        onChange={(e) =>
                          handleFieldChange("initialPayment", e.target.value)
                        }
                        className={getFieldClassName("initialPayment")}
                        required
                        aria-describedby={
                          formErrors.initialPayment
                            ? "payment-error"
                            : undefined
                        }
                      />
                      {getFieldIcon("initialPayment")}
                    </div>
                    {formErrors.initialPayment && (
                      <p
                        id="payment-error"
                        className="text-sm text-red-600 flex items-center gap-1"
                      >
                        <AlertTriangle className="h-3 w-3" />
                        {formErrors.initialPayment}
                      </p>
                    )}
                    {formData.contractAmount && formData.initialPayment && (
                      <p className="text-sm text-gray-600">
                        Due Amount:{" "}
                        {(
                          Number.parseFloat(formData.contractAmount) -
                          Number.parseFloat(formData.initialPayment)
                        ).toFixed(2)}{" "}
                        BDT
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddClientOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || isDuplicateCheck}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : isDuplicateCheck ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Checking...
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
                    <AlertDescription className="text-red-800">
                      {submitError}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editName">Full Name *</Label>
                    <Input
                      id="editName"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) =>
                        handleFieldChange("name", e.target.value)
                      }
                      className={
                        formErrors.name
                          ? "border-red-500 focus:border-red-500"
                          : ""
                      }
                      required
                      aria-describedby={
                        formErrors.name ? "edit-name-error" : undefined
                      }
                    />
                    {formErrors.name && (
                      <p
                        id="edit-name-error"
                        className="text-sm text-red-600 flex items-center gap-1"
                      >
                        <AlertTriangle className="h-3 w-3" />
                        {formErrors.name}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editPhone">Phone Number *</Label>
                    <Input
                      id="editPhone"
                      placeholder="+1 234 567 890"
                      value={formData.phone}
                      onChange={(e) =>
                        handleFieldChange("phone", e.target.value)
                      }
                      className={
                        formErrors.phone
                          ? "border-red-500 focus:border-red-500"
                          : ""
                      }
                      required
                      aria-describedby={
                        formErrors.phone ? "edit-phone-error" : undefined
                      }
                    />
                    {formErrors.phone && (
                      <p
                        id="edit-phone-error"
                        className="text-sm text-red-600 flex items-center gap-1"
                      >
                        <AlertTriangle className="h-3 w-3" />
                        {formErrors.phone}
                      </p>
                    )}
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
                      onChange={(e) =>
                        handleFieldChange("email", e.target.value)
                      }
                      className={
                        formErrors.email
                          ? "border-red-500 focus:border-red-500"
                          : ""
                      }
                      required
                      aria-describedby={
                        formErrors.email ? "edit-email-error" : undefined
                      }
                    />
                    {formErrors.email && (
                      <p
                        id="edit-email-error"
                        className="text-sm text-red-600 flex items-center gap-1"
                      >
                        <AlertTriangle className="h-3 w-3" />
                        {formErrors.email}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editPassport">Passport Number *</Label>
                    <Input
                      id="editPassport"
                      placeholder="A12345678"
                      value={formData.passportNumber}
                      onChange={(e) =>
                        handleFieldChange(
                          "passportNumber",
                          e.target.value.toUpperCase()
                        )
                      }
                      className={
                        formErrors.passportNumber
                          ? "border-red-500 focus:border-red-500"
                          : ""
                      }
                      required
                      aria-describedby={
                        formErrors.passportNumber
                          ? "edit-passport-error"
                          : undefined
                      }
                    />
                    {formErrors.passportNumber && (
                      <p
                        id="edit-passport-error"
                        className="text-sm text-red-600 flex items-center gap-1"
                      >
                        <AlertTriangle className="h-3 w-3" />
                        {formErrors.passportNumber}
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editAddress">Address</Label>
                  <Input
                    id="editAddress"
                    placeholder="123 Main Street, City, Country"
                    value={formData.address}
                    onChange={(e) =>
                      handleFieldChange("address", e.target.value)
                    }
                  />
                </div>

                {hasB2BClients && (
                  <div className="space-y-2">
                    <Label htmlFor="editB2bClient">
                      Referred by B2B Client (optional)
                    </Label>
                    <Select
                      value={selectedB2BClient}
                      onValueChange={setSelectedB2BClient}
                    >
                      <SelectTrigger id="editB2bClient">
                        <SelectValue placeholder="Select B2B client (if referred)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          Direct Client (No B2B Reference)
                        </SelectItem>
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
                      onChange={(e) =>
                        handleFieldChange("destination", e.target.value)
                      }
                      className={
                        formErrors.destination
                          ? "border-red-500 focus:border-red-500"
                          : ""
                      }
                      required
                      aria-describedby={
                        formErrors.destination
                          ? "edit-destination-error"
                          : undefined
                      }
                    />
                    {formErrors.destination && (
                      <p
                        id="edit-destination-error"
                        className="text-sm text-red-600 flex items-center gap-1"
                      >
                        <AlertTriangle className="h-3 w-3" />
                        {formErrors.destination}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editClientType">Client Type</Label>
                    <Select
                      value={selectedClientType}
                      onValueChange={setSelectedClientType}
                    >
                      <SelectTrigger id="editClientType">
                        <SelectValue placeholder="Select client type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="saudi-kuwait">
                          Saudi & Kuwait
                        </SelectItem>
                        <SelectItem value="other-countries">
                          Other Countries
                        </SelectItem>
                        <SelectItem value="omra-visa">
                          Omra Visa (Saudi)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editStatus">Current Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        setFormData({ ...formData, status: value })
                      }
                    >
                      <SelectTrigger id="editStatus">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {getStatusesForClientType(selectedClientType).map(
                          (status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editVisaType">Visa Type</Label>
                    <Input
                      id="editVisaType"
                      placeholder="Work Visa, Tourist Visa, etc."
                      value={formData.visaType}
                      onChange={(e) =>
                        handleFieldChange("visaType", e.target.value)
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editContractAmount">
                      Contract Amount (BDT) *
                    </Label>
                    <Input
                      id="editContractAmount"
                      type="number"
                      placeholder="0"
                      value={formData.contractAmount}
                      disabled
                      className="bg-gray-50 text-gray-600 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500">
                      Contract amount cannot be modified after creation
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editInitialPayment">
                      Initial Payment (BDT) *
                    </Label>
                    <Input
                      id="editInitialPayment"
                      type="number"
                      placeholder="0"
                      value={formData.initialPayment}
                      disabled
                      className="bg-gray-50 text-gray-600 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500">
                      Initial payment cannot be modified after creation
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editNotes">Additional Notes</Label>
                  <Textarea
                    id="editNotes"
                    placeholder="Enter any additional information about the client"
                    value={formData.notes}
                    onChange={(e) => handleFieldChange("notes", e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter className="sticky bottom-0 bg-white pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditClientOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || isDuplicateCheck}
                >
                  {isDuplicateCheck ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Checking...
                    </>
                  ) : isSubmitting ? (
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
                This client will be archived and hidden from the main view. You
                can still access archived clients later if needed.
              </p>
              {transactions.length > 0 && (
                <Alert className="mt-2 border-amber-200 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mr-2" />
                  <AlertDescription className="text-amber-800">
                    This client has {transactions.length} transaction record
                    {transactions.length > 1 ? "s" : ""}. These records will
                    remain in the system but will be hidden along with the
                    client.
                  </AlertDescription>
                </Alert>
              )}
              <p className="font-medium mt-2">
                Client:{" "}
                <span className="font-bold">{clientToDelete?.name}</span>
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
      <AlertDialog
        open={transactionDeleteConfirmOpen}
        onOpenChange={setTransactionDeleteConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete This Transaction?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This transaction will be permanently deleted from the system.
                This action cannot be undone.
              </p>
              {transactionToDelete && (
                <div className="mt-4 p-3 border rounded-md bg-gray-50">
                  <p className="font-medium">Transaction Details:</p>
                  <p className="text-sm text-gray-600">
                    Date: {transactionToDelete.date}
                  </p>
                  <p className="text-sm text-gray-600">
                    Received Amount:{" "}
                    {formatCurrency(transactionToDelete.receivedAmount)}
                  </p>
                  {transactionToDelete.refundAmount > 0 && (
                    <p className="text-sm text-gray-600">
                      Refund Amount:{" "}
                      {formatCurrency(transactionToDelete.refundAmount)}
                    </p>
                  )}
                  {transactionToDelete.notes && (
                    <p className="text-sm text-gray-600">
                      Notes: {transactionToDelete.notes}
                    </p>
                  )}
                </div>
              )}
              <Alert className="mt-2 border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                <AlertDescription className="text-red-800">
                  Deleting this transaction will affect the client's due amount
                  calculation.
                </AlertDescription>
              </Alert>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingTransaction}>
              Cancel
            </AlertDialogCancel>
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
            <Select
              value={statusFilter}
              onValueChange={(value) => handleFilterChange("status", value)}
            >
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

      <div className="rounded-md border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50">
              <TableHead className="w-[40px]"></TableHead>
              <TableHead className="font-semibold">Client Details</TableHead>
              <TableHead className="font-semibold">Source</TableHead>
              <TableHead className="font-semibold">Passport</TableHead>
              <TableHead className="font-semibold">Destination</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold text-center">
                Financial Summary
              </TableHead>
              <TableHead className="font-semibold text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  <p className="mt-2 text-muted-foreground">
                    Loading clients...
                  </p>
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
                  <TableRow
                    key={client._id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleRowExpansion(client._id)}
                        className="h-8 w-8 hover:bg-blue-50"
                        aria-label={
                          expandedClientId === client._id
                            ? "Collapse client details"
                            : "Expand client details"
                        }
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
                        <div className="font-medium text-gray-900">
                          {client.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {client.email}
                        </div>
                        {client.phone && (
                          <div className="text-sm text-gray-500">
                            {client.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getClientSourceBadge(client.associatedB2BId)}
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-sm bg-gray-50 px-2 py-1 rounded border">
                        {client.passportNumber}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{client.destination}</div>
                      {client.visaType && (
                        <div className="text-sm text-gray-500">
                          {client.visaType}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(client.status)}</TableCell>
                    <TableCell className="text-center">
                      <div className="space-y-2">
                        <div className="flex flex-col items-center space-y-1">
                          <div className="text-sm font-medium text-gray-700">
                            Contract: {formatCurrency(client.contractAmount)}
                          </div>
                          <div
                            className={`text-sm font-medium ${
                              formatCurrencyWithColor(
                                client.dueAmount,
                                client.dueAmount > client.contractAmount * 0.8
                              ).colorClass
                            }`}
                          >
                            Due:{" "}
                            {
                              formatCurrencyWithColor(client.dueAmount)
                                .formatted
                            }
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              calculatePaymentProgress(
                                client.contractAmount,
                                client.dueAmount
                              ) === 100
                                ? "bg-green-500"
                                : calculatePaymentProgress(
                                    client.contractAmount,
                                    client.dueAmount
                                  ) > 50
                                ? "bg-blue-500"
                                : "bg-orange-500"
                            }`}
                            style={{
                              width: `${calculatePaymentProgress(
                                client.contractAmount,
                                client.dueAmount
                              )}%`,
                            }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {Math.round(
                            calculatePaymentProgress(
                              client.contractAmount,
                              client.dueAmount
                            )
                          )}
                          % paid
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleViewDetails(client)}
                          className="h-8 w-8 hover:bg-blue-50 hover:border-blue-200"
                          aria-label={`View details for ${client.name}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEditClient(client)}
                          className="h-8 w-8 hover:bg-green-50 hover:border-green-200"
                          aria-label={`Edit ${client.name}`}
                        >
                          <FileEdit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDeleteClient(client)}
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 hover:border-red-200"
                          aria-label={`Archive ${client.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>

                  {expandedClientId === client._id && (
                    <React.Fragment key={`expanded-${client._id}`}>
                      <TableRow>
                        <TableCell colSpan={9} className="p-0 border-t-0">
                          <div className="bg-gradient-to-br from-gray-50 to-blue-50/30 p-6 border-l-4 border-blue-500">
                            <div className="space-y-6">
                              <div className="flex justify-between items-center">
                                <div>
                                  <h3 className="text-xl font-bold text-gray-900">
                                    Client Details & Transaction History
                                  </h3>
                                  <p className="text-sm text-gray-600 mt-1">
                                    Complete overview of {client.name}'s account
                                  </p>
                                </div>
                                <Button
                                  onClick={() =>
                                    handleAddTransaction(
                                      client._id,
                                      client.name
                                    )
                                  }
                                  disabled={addingTransaction || isSubmitting}
                                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md"
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Payment
                                </Button>
                              </div>

                              <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
                                <h4 className="text-lg font-semibold text-gray-900 mb-3">
                                  Financial Summary
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                                    <div className="text-2xl font-bold text-blue-600">
                                      {formatCurrency(client.contractAmount)}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      Total Contract
                                    </div>
                                  </div>
                                  <div className="text-center p-3 bg-green-50 rounded-lg">
                                    <div className="text-2xl font-bold text-green-600">
                                      {formatCurrency(
                                        client.contractAmount - client.dueAmount
                                      )}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      Amount Paid
                                    </div>
                                  </div>
                                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                                    <div
                                      className={`text-2xl font-bold ${
                                        client.dueAmount > 0
                                          ? "text-orange-600"
                                          : "text-green-600"
                                      }`}
                                    >
                                      {formatCurrency(client.dueAmount)}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      Outstanding Balance
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-4">
                                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                                    <span>Payment Progress</span>
                                    <span>
                                      {Math.round(
                                        calculatePaymentProgress(
                                          client.contractAmount,
                                          client.dueAmount
                                        )
                                      )}
                                      % Complete
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div
                                      className={`h-3 rounded-full transition-all duration-500 ${
                                        calculatePaymentProgress(
                                          client.contractAmount,
                                          client.dueAmount
                                        ) === 100
                                          ? "bg-gradient-to-r from-green-500 to-green-600"
                                          : calculatePaymentProgress(
                                              client.contractAmount,
                                              client.dueAmount
                                            ) > 50
                                          ? "bg-gradient-to-r from-blue-500 to-blue-600"
                                          : "bg-gradient-to-r from-orange-500 to-orange-600"
                                      }`}
                                      style={{
                                        width: `${calculatePaymentProgress(
                                          client.contractAmount,
                                          client.dueAmount
                                        )}%`,
                                      }}
                                    ></div>
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white rounded-lg shadow-sm border p-4">
                                  <h4 className="text-lg font-semibold text-gray-900 mb-3">
                                    Contact Information
                                  </h4>
                                  <div className="space-y-3">
                                    <div className="flex items-center space-x-3">
                                      <Mail className="h-4 w-4 text-gray-400" />
                                      <span className="text-gray-900">
                                        {client.email}
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                      <Phone className="h-4 w-4 text-gray-400" />
                                      <span className="text-gray-900">
                                        {client.phone}
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                      <FileText className="h-4 w-4 text-gray-400" />
                                      <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                                        {client.passportNumber}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="bg-white rounded-lg shadow-sm border p-4">
                                  <h4 className="text-lg font-semibold text-gray-900 mb-3">
                                    Travel Details
                                  </h4>
                                  <div className="space-y-3">
                                    <div className="flex items-center space-x-3">
                                      <MapPin className="h-4 w-4 text-gray-400" />
                                      <span className="text-gray-900">
                                        {client.destination}
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                      <Calendar className="h-4 w-4 text-gray-400" />
                                      <span className="text-gray-900">
                                        {client.travelDate
                                          ? new Date(
                                              client.travelDate
                                            ).toLocaleDateString()
                                          : "Not set"}
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                      <CreditCard className="h-4 w-4 text-gray-400" />
                                      <span className="text-gray-900">
                                        {client.visaType || "Not specified"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="bg-white rounded-lg shadow-sm border">
                                <div className="p-4 border-b flex justify-between items-center">
                                  <div>
                                    <h4 className="text-lg font-semibold text-gray-900">
                                      Transaction History
                                    </h4>
                                    <p className="text-sm text-gray-600 mt-1">
                                      All payments and transactions for this
                                      client
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm text-gray-600">
                                      Current Outstanding
                                    </div>
                                    <div className="text-lg font-bold text-red-600">
                                      {formatCurrency(client.dueAmount)}
                                    </div>
                                  </div>
                                </div>
                                <div />

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
                                    <Label htmlFor="new-date">Date *</Label>
                                    <Input
                                      id="new-date"
                                      type="date"
                                      value={newTransaction.date}
                                      onChange={(e) => {
                                        setNewTransaction({ ...newTransaction, date: e.target.value })
                                        if (transactionErrors.date) {
                                          setTransactionErrors({ ...transactionErrors, date: "" })
                                        }
                                      }}
                                      className={transactionErrors.date ? "border-red-500 focus:border-red-500" : ""}
                                      aria-describedby={transactionErrors.date ? "date-error" : undefined}
                                    />
                                    {transactionErrors.date && (
                                      <p id="date-error" className="text-sm text-red-600 flex items-center gap-1">
                                        <AlertTriangle className="h-3 w-3" />
                                        {transactionErrors.date}
                                      </p>
                                    )}
                                  </div>
                                  <div className="space-y-1">
                                    <Label htmlFor="new-received-amount">Received Amount (BDT) *</Label>
                                    <Input
                                      id="new-received-amount"
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      placeholder="0.00"
                                      value={newTransaction.receivedAmount || ""}
                                      onChange={(e) => {
                                        setNewTransaction({
                                          ...newTransaction,
                                          receivedAmount: Number.parseFloat(e.target.value) || 0,
                                        })
                                        if (transactionErrors.receivedAmount) {
                                          setTransactionErrors({ ...transactionErrors, receivedAmount: "" })
                                        }
                                      }}
                                      className={transactionErrors.receivedAmount ? "border-red-500 focus:border-red-500" : ""}
                                      aria-describedby={transactionErrors.receivedAmount ? "received-amount-error" : undefined}
                                    />
                                    {transactionErrors.receivedAmount && (
                                      <p id="received-amount-error" className="text-sm text-red-600 flex items-center gap-1">
                                        <AlertTriangle className="h-3 w-3" />
                                        {transactionErrors.receivedAmount}
                                      </p>
                                    )}
                                  </div>
                                  <div className="space-y-1">
                                    <Label htmlFor="new-refund-amount">Refund Amount (BDT)</Label>
                                    <Input
                                      id="new-refund-amount"
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      placeholder="0.00"
                                      value={newTransaction.refundAmount || ""}
                                      onChange={(e) => {
                                        setNewTransaction({
                                          ...newTransaction,
                                          refundAmount: Number.parseFloat(e.target.value) || 0,
                                        })
                                        if (transactionErrors.refundAmount) {
                                          setTransactionErrors({ ...transactionErrors, refundAmount: "" })
                                        }
                                      }}
                                      className={transactionErrors.refundAmount ? "border-red-500 focus:border-red-500" : ""}
                                      aria-describedby={transactionErrors.refundAmount ? "refund-amount-error" : undefined}
                                    />
                                    {transactionErrors.refundAmount && (
                                      <p id="refund-amount-error" className="text-sm text-red-600 flex items-center gap-1">
                                        <AlertTriangle className="h-3 w-3" />
                                        {transactionErrors.refundAmount}
                                      </p>
                                    )}
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
                                
                              
                                {(newTransaction.receivedAmount > 0 || newTransaction.refundAmount > 0) && (
                                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <h5 className="text-sm font-medium text-blue-900 mb-2">Transaction Impact</h5>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <span className="text-gray-600">Net Payment:</span>
                                        <span className="ml-2 font-medium text-green-700">
                                          +{formatCurrency((newTransaction.receivedAmount || 0) - (newTransaction.refundAmount || 0))}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-gray-600">New Outstanding:</span>
                                        <span className="ml-2 font-medium text-blue-700">
                                          {formatCurrency(Math.max(0, client.dueAmount - ((newTransaction.receivedAmount || 0) - (newTransaction.refundAmount || 0))))}
                                        </span>
                                      </div>
                                    </div>
                                    {newTransaction.refundAmount > 0 && (
                                      <div className="mt-2 text-xs text-amber-700 bg-amber-50 p-2 rounded">
                                        ⚠️ This transaction includes a refund of {formatCurrency(newTransaction.refundAmount)}
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                <div className="flex justify-end">
                                  <Button
                                  variant="outline"
                                  size="sm"
                                  className="mr-2"
                                  onClick={() => {
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
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button 
                                  size="sm" 
                                  onClick={handleSaveNewTransaction} 
                                  disabled={isSubmitting || (newTransaction.receivedAmount === 0 && newTransaction.refundAmount === 0)}
                                  className={newTransaction.receivedAmount > 0 || newTransaction.refundAmount > 0 ? "bg-green-600 hover:bg-green-700" : ""}
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

                                <div className="overflow-x-auto bg-white rounded-lg border shadow-sm">
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
                                                  className="h-8 w-8 text-gray-400 cursor-not-allowed"
                                                  disabled={true}
                                                  title="Edit Transaction (Disabled)"
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
                          </div>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
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
  );
}
