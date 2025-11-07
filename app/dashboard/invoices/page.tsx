"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { AddInvoiceModal } from "@/components/invoices/add-invoice-modal"
import { InvoiceTable } from "@/components/invoices/invoice-table"
import { InvoiceFilters } from "@/components/invoices/invoice-filters"
import { InvoiceStats } from "@/components/invoices/invoice-stats"
import { dummyInvoices } from "@/data/invoices"
import { Invoice, InvoiceFilters as IInvoiceFilters, InvoiceStats as IInvoiceStats } from "@/types/invoice"

export default function InvoicesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [invoices, setInvoices] = useState<Invoice[]>(dummyInvoices)
  const [filters, setFilters] = useState<IInvoiceFilters>({
    search: "",
    status: "",
    dateFrom: "",
    dateTo: "",
    salesBy: ""
  })

  // Filter invoices based on current filters
  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => {
      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase()
        const matchesSearch = 
          invoice.invoiceNo.toLowerCase().includes(searchTerm) ||
          invoice.clientName.toLowerCase().includes(searchTerm) ||
          invoice.clientPhone.includes(searchTerm) ||
          invoice.passportNo.toLowerCase().includes(searchTerm) ||
          invoice.salesBy.toLowerCase().includes(searchTerm)
        
        if (!matchesSearch) return false
      }

      // Status filter
      if (filters.status && invoice.status !== filters.status) {
        return false
      }

      // Sales by filter
      if (filters.salesBy && invoice.salesBy !== filters.salesBy) {
        return false
      }

      // Date range filter
      if (filters.dateFrom) {
        const invoiceDate = new Date(invoice.salesDate)
        const fromDate = new Date(filters.dateFrom)
        if (invoiceDate < fromDate) return false
      }

      if (filters.dateTo) {
        const invoiceDate = new Date(invoice.salesDate)
        const toDate = new Date(filters.dateTo)
        if (invoiceDate > toDate) return false
      }

      return true
    })
  }, [invoices, filters])

  // Calculate statistics
  const stats = useMemo((): IInvoiceStats => {
    const totalInvoices = filteredInvoices.length
    const totalSales = filteredInvoices.reduce((sum, inv) => sum + inv.salesPrice, 0)
    const totalReceived = filteredInvoices.reduce((sum, inv) => sum + inv.receivedAmount, 0)
    const totalDue = filteredInvoices.reduce((sum, inv) => sum + inv.dueAmount, 0)
    
    const paidInvoices = filteredInvoices.filter(inv => inv.status === 'paid').length
    const partialInvoices = filteredInvoices.filter(inv => inv.status === 'partial').length
    const overdueInvoices = filteredInvoices.filter(inv => inv.status === 'overdue').length

    return {
      totalInvoices,
      totalSales,
      totalReceived,
      totalDue,
      paidInvoices,
      partialInvoices,
      overdueInvoices
    }
  }, [filteredInvoices])

  // Get unique sales staff for filter options
  const salesByOptions = useMemo(() => {
    const uniqueStaff = Array.from(new Set(invoices.map(inv => inv.salesBy)))
    return uniqueStaff.sort()
  }, [invoices])

  // Handle invoice actions
  const handleView = (invoice: Invoice) => {
    console.log("View invoice:", invoice)
    // TODO: Implement view functionality
  }

  const handleEdit = (invoice: Invoice) => {
    console.log("Edit invoice:", invoice)
    // TODO: Implement edit functionality
  }

  const handleDelete = (invoice: Invoice) => {
    if (confirm(`Are you sure you want to delete invoice ${invoice.invoiceNo}?`)) {
      setInvoices(prev => prev.filter(inv => inv.id !== invoice.id))
    }
  }

  const handleDownload = (invoice: Invoice) => {
    console.log("Download invoice:", invoice)
    // TODO: Implement PDF download
  }

  const handleSend = (invoice: Invoice) => {
    console.log("Send invoice:", invoice)
    // TODO: Implement email sending
  }

  const handleAddInvoice = (newInvoice: Invoice) => {
    setInvoices(prev => [newInvoice, ...prev])
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-600">Manage your invoices and billing information</p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Invoice
        </Button>
      </div>

      {/* Statistics */}
      <InvoiceStats stats={stats} />

      {/* Filters */}
      <InvoiceFilters 
        filters={filters}
        onFiltersChange={setFilters}
        salesByOptions={salesByOptions}
      />

      {/* Invoice Table */}
      <InvoiceTable
        invoices={filteredInvoices}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onDownload={handleDownload}
        onSend={handleSend}
      />

      {/* Add Invoice Modal */}
      <AddInvoiceModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onInvoiceAdded={handleAddInvoice}
      />
    </div>
  )
}