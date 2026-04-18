"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Loader2 } from "lucide-react"
import { NonCommissionTable } from "@/components/invoices/non-commission-table"
import { PaginationWithLinks } from "@/components/ui/pagination-with-links"
import { MoneyReceiptModal } from "@/components/invoices/money-receipt-modal"
import { AddNonCommissionModal } from "@/components/invoices/add-non-commission-modal"
import { useToast } from "@/hooks/use-toast"
import { PageWrapper } from "@/components/shared/page-wrapper"
import FilterBar from "@/components/money-receipts/FilterBar"
import { DateRange } from "react-day-picker"
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

export default function NonCommissionInvoicesPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [invoices, setInvoices] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editInvoiceId, setEditInvoiceId] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1
  })

  const fetchInvoices = useCallback(async (params = {}) => {
    setLoading(true)
    try {
      const queryParams: any = {
        page: String(pagination.page),
        pageSize: String(pagination.pageSize),
        search: search,
        ...params
      }

      if (dateRange?.from) queryParams.startDate = dateRange.from.toISOString().slice(0, 10)
      if (dateRange?.to) queryParams.endDate = dateRange.to.toISOString().slice(0, 10)

      const qs = new URLSearchParams(queryParams).toString()
      
      const res = await fetch(`/api/invoices/non-commission?${qs}`)
      const data = await res.json()
      
      if (res.ok) {
        setInvoices(data.items || [])
        setPagination(prev => ({
          ...prev,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages
        }))
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to fetch invoices", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.pageSize, search, dateRange, toast])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  const handleRefresh = () => {
    fetchInvoices()
  }

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  const handleEdit = useCallback((invoice: any) => {
    const id = String(invoice?.id || invoice?._id || "").trim()
    if (!id) return
    setEditInvoiceId(id)
    setIsModalOpen(true)
  }, [])

  const handleCreateNew = () => {
    setEditInvoiceId(null)
    setIsModalOpen(true)
  }

  const [invoiceToDelete, setInvoiceToDelete] = useState<any>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = useCallback((invoice: any) => {
    setInvoiceToDelete(invoice)
  }, [])

  const confirmDelete = async () => {
    if (!invoiceToDelete) return
    try {
      setIsDeleting(true)
      const res = await fetch(`/api/invoices/${invoiceToDelete.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error("Delete failed")
      toast({ title: "Success", description: `Invoice ${invoiceToDelete.invoiceNo} deleted successfully` })
      fetchInvoices()
    } catch (e) {
      toast({ title: "Error", description: "Failed to delete invoice", variant: "destructive" })
    } finally {
      setIsDeleting(false)
      setInvoiceToDelete(null)
    }
  }

  const [moneyReceiptOpen, setMoneyReceiptOpen] = useState(false)
  const [selectedInvoiceForMR, setSelectedInvoiceForMR] = useState<any>(undefined)

  const handleMoneyReceipt = useCallback((invoice: any) => {
    setSelectedInvoiceForMR(invoice)
    setMoneyReceiptOpen(true)
  }, [])

  return (
    <PageWrapper breadcrumbs={[{ label: "Invoice" }, { label: "Non Commission" }]}>
      <div className="space-y-6 px-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center gap-3">
            <Button 
              onClick={handleCreateNew}
              className="bg-sky-500 hover:bg-sky-600 text-white rounded-md h-10 px-6 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create
            </Button>
          </div>

          <FilterBar
            dateRange={dateRange}
            search={search}
            onDateRangeChange={setDateRange}
            onSearchChange={setSearch}
            onRefresh={handleRefresh}
          />
        </div>

        {/* Table Section */}
        <div className="relative bg-white rounded-lg shadow-sm border p-4">
          {loading && invoices.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
            </div>
          ) : (
            <>
              <NonCommissionTable
                invoices={invoices}
                onView={(inv) => console.log("View", inv)}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onMoneyReceipt={handleMoneyReceipt}
                onPartialCost={(inv) => console.log("Partial Cost", inv)}
              />
              
              <div className="mt-4">
                <PaginationWithLinks
                  totalCount={pagination.total}
                  pageSize={pagination.pageSize}
                  page={pagination.page}
                  setPage={handlePageChange}
                  onPageSizeChange={() => {}}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <AddNonCommissionModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditInvoiceId(null) }} 
        onInvoiceAdded={() => fetchInvoices()}
        initialInvoiceId={editInvoiceId}
      />

      <MoneyReceiptModal
        open={moneyReceiptOpen}
        onClose={() => setMoneyReceiptOpen(false)}
        invoice={selectedInvoiceForMR}
        onSubmit={() => fetchInvoices()}
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
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  )
}
