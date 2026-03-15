"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { MoneyReceiptModal } from "@/components/invoices/money-receipt-modal"
import { AddInvoiceModal } from "@/components/invoices/add-invoice-modal"
import { InvoiceTable } from "@/components/invoices/invoice-table"
import { InvoiceFilters } from "@/components/invoices/invoice-filters"
import { InvoiceStats } from "@/components/invoices/invoice-stats"
// import { dummyInvoices } from "@/data/invoices"
import { Invoice, InvoiceFilters as IInvoiceFilters, InvoiceStats as IInvoiceStats } from "@/types/invoice"

import { PaginationWithLinks } from "@/components/ui/pagination-with-links"
import { useToast } from "@/components/ui/use-toast"
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
import { Loader2 } from "lucide-react"

export default function InvoicesPage() {
  const { toast } = useToast()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | undefined>(undefined)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  })

  const [filters, setFilters] = useState<IInvoiceFilters>({
    search: "",
    status: "",
    dateFrom: "",
    dateTo: "",
    salesBy: ""
  })

  // Load invoices from API
  const loadInvoices = useCallback(async (page = 1, pageSize = pagination.pageSize) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        search: filters.search || "",
        status: filters.status || "",
        dateFrom: filters.dateFrom || "",
        dateTo: filters.dateTo || "",
        salesBy: filters.salesBy || ""
      })
      
      const res = await fetch(`/api/invoices?${params.toString()}`)
      const data = await res.json()
      
      setInvoices(data.items || [])
      setPagination(prev => ({
        ...prev,
        page: data.pagination.page,
        pageSize: data.pagination.pageSize,
        total: data.pagination.total,
        totalPages: Math.ceil(data.pagination.total / data.pagination.pageSize)
      }))
    } catch (e) {
      console.error("Load invoices error:", e)
      toast({
        title: "Error",
        description: "Failed to load invoices",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [filters, pagination.pageSize, toast])

  useEffect(() => {
    loadInvoices(1)
  }, [filters, loadInvoices])

  // Get unique sales staff for filter options
  const salesByOptions = useMemo(() => {
    // In a real system, this would come from an employee API
    // For now, we extract from the loaded invoices
    const uniqueStaff = Array.from(new Set(invoices.map(inv => inv.salesBy)))
    return uniqueStaff.sort()
  }, [invoices])

  // Deletion logic
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = (invoice: Invoice) => {
    setInvoiceToDelete(invoice)
  }

  const confirmDelete = async () => {
    if (!invoiceToDelete) return
    
    try {
      setIsDeleting(true)
      const res = await fetch(`/api/invoices/${invoiceToDelete.id}`, {
        method: 'DELETE'
      })
      
      if (!res.ok) throw new Error("Delete failed")
      
      toast({
        title: "Success",
        description: `Invoice ${invoiceToDelete.invoiceNo} deleted successfully`,
      })
      
      // Reload current page
      loadInvoices(pagination.page)
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to delete invoice",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
      setInvoiceToDelete(null)
    }
  }

  const handleView = (invoice: Invoice) => {
    // Implement view logic
  }

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice)
    setIsModalOpen(true)
  }

  const [moneyReceiptOpen, setMoneyReceiptOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | undefined>(undefined)

  const handleMoneyReceipt = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setMoneyReceiptOpen(true)
  }

  const handleAddInvoice = () => {
    loadInvoices(1)
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

      {/* Filters */}
      <InvoiceFilters 
        filters={filters}
        onFiltersChange={setFilters}
        salesByOptions={salesByOptions}
      />

      {/* Invoice Table */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        )}
        <InvoiceTable
          invoices={invoices}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onMoneyReceipt={handleMoneyReceipt}
        />
        
        <PaginationWithLinks
          totalCount={pagination.total}
          pageSize={pagination.pageSize}
          page={pagination.page}
          setPage={(p) => loadInvoices(p)}
          onPageSizeChange={(s) => loadInvoices(1, s)}
        />
      </div>

      {/* Add Invoice Modal */}
      <AddInvoiceModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingInvoice(undefined) }}
        onInvoiceAdded={handleAddInvoice}
        initialInvoice={editingInvoice}
      />

      <MoneyReceiptModal
        open={moneyReceiptOpen}
        onClose={() => setMoneyReceiptOpen(false)}
        invoice={selectedInvoice}
        onSubmit={() => loadInvoices(pagination.page)}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!invoiceToDelete} onOpenChange={(open) => !open && setInvoiceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will soft-delete invoice <strong>{invoiceToDelete?.invoiceNo}</strong>. 
              The client and vendor balances will be adjusted automatically to revert the financial impact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault()
                confirmDelete()
              }}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : "Confirm Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
