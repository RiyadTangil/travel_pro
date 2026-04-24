"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Loader2 } from "lucide-react"
import { InvoiceTable } from "@/components/invoices/invoice-table"
import { AddVisaInvoiceModal } from "@/components/invoices/add-visa-invoice-modal"
import { AssignEmployeeModal } from "@/components/invoices/assign-employee-modal"
import { MoneyReceiptModal } from "@/components/invoices/money-receipt-modal"
import { PageWrapper } from "@/components/shared/page-wrapper"
import FilterToolbar from "@/components/shared/filter-toolbar"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Invoice } from "@/types/invoice"

export default function VisaInvoicesPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [status, setStatus] = useState("")
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [editInvoiceId, setEditInvoiceId] = useState<string | null>(null)
  const [assignData, setAssignData] = useState<{ id: string; passports: any[] } | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)

  const fetchInvoices = useCallback(
    async (overridePage?: number, overridePageSize?: number) => {
      const p = overridePage ?? page
      const ps = overridePageSize ?? pageSize
      setLoading(true)
      try {
        const queryParams: Record<string, string> = {
          page: String(p),
          pageSize: String(ps),
          search: debouncedSearch,
          invoiceType: "visa",
        }
        if (status) queryParams.status = status
        if (dateRange?.from) queryParams.dateFrom = dateRange.from.toISOString().slice(0, 10)
        if (dateRange?.to) queryParams.dateTo = dateRange.to.toISOString().slice(0, 10)

        const qs = new URLSearchParams(queryParams).toString()

        const res = await fetch(`/api/invoices?${qs}`)
        const data = await res.json()

        if (res.ok) {
          setInvoices(data.items || [])
          setTotal(Number(data.pagination?.total ?? 0))
        } else {
          toast({ title: "Error", description: data?.error || "Failed to fetch invoices", variant: "destructive" })
        }
      } catch {
        toast({ title: "Error", description: "Failed to fetch invoices", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    },
    [page, pageSize, debouncedSearch, dateRange, status, toast]
  )

  useEffect(() => {
    const t = setTimeout(() => {
      const next = search.trim()
      setDebouncedSearch((prev) => {
        if (next !== prev) setPage(1)
        return next
      })
    }, 250)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    void fetchInvoices()
  }, [fetchInvoices])

  const handleRefresh = () => void fetchInvoices()

  const handleCreateNew = () => {
    setEditInvoiceId(null)
    setIsModalOpen(true)
  }

  const handleEdit = useCallback((invoice: Invoice) => {
    setEditInvoiceId(invoice.id)
    setIsModalOpen(true)
  }, [])

  const handleAssignBy = useCallback(
    async (invoice: Invoice) => {
      try {
        const res = await fetch(`/api/invoices/visa/${invoice.id}`)
        const data = await res.json()
        if (res.ok && data.invoice) {
          setAssignData({ id: invoice.id, passports: data.invoice.passports || [] })
          setIsAssignModalOpen(true)
        } else {
          toast({ title: "Error", description: "Failed to fetch invoice details", variant: "destructive" })
        }
      } catch {
        toast({ title: "Error", description: "Something went wrong", variant: "destructive" })
      }
    },
    [toast]
  )

  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = useCallback((invoice: Invoice) => {
    setInvoiceToDelete(invoice)
  }, [])

  const confirmDelete = async () => {
    if (!invoiceToDelete) return
    try {
      setIsDeleting(true)
      const res = await fetch(`/api/invoices/${invoiceToDelete.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      toast({ title: "Success", description: `Invoice ${invoiceToDelete.invoiceNo} deleted successfully` })
      await fetchInvoices()
    } catch {
      toast({ title: "Error", description: "Failed to delete invoice", variant: "destructive" })
    } finally {
      setIsDeleting(false)
      setInvoiceToDelete(null)
    }
  }

  const [moneyReceiptOpen, setMoneyReceiptOpen] = useState(false)
  const [selectedInvoiceForMR, setSelectedInvoiceForMR] = useState<Invoice | undefined>(undefined)

  const handleMoneyReceipt = useCallback((invoice: Invoice) => {
    setSelectedInvoiceForMR(invoice)
    setMoneyReceiptOpen(true)
  }, [])

  

  return (
    <PageWrapper breadcrumbs={[{ label: "Invoice" }, { label: "Visa Invoice" }]}>
      <div className="mx-4 mb-4 space-y-4">
          <FilterToolbar
            showDateRange
            dateRange={dateRange}
            onDateRangeChange={(r) => {
              setDateRange(r)
              setPage(1)
            }}
            showSearch
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search invoice, client, passport..."
            showRefresh
            onRefresh={handleRefresh}
            className="flex-1 min-w-0"
          >
      
              <Button
                onClick={handleCreateNew}
                
              >
                <Plus className="h-4 w-4" />
                Create
              </Button>
        
          </FilterToolbar>

        <InvoiceTable
          invoices={invoices}
          loading={loading}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={(newPage, newSize) => {
            setPage(newPage)
            setPageSize(newSize)
          }}
          onView={() => {}}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onMoneyReceipt={handleMoneyReceipt}
          onAssignBy={handleAssignBy}
        />

        <AddVisaInvoiceModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setEditInvoiceId(null)
          }}
          onInvoiceAdded={() => {
            setPage(1)
            void fetchInvoices(1)
          }}
          initialInvoiceId={editInvoiceId}
        />

        <AssignEmployeeModal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          invoiceId={assignData?.id || ""}
          passports={assignData?.passports || []}
        />

        <MoneyReceiptModal
          open={moneyReceiptOpen}
          onClose={() => setMoneyReceiptOpen(false)}
          invoice={selectedInvoiceForMR}
          onSubmit={() => void fetchInvoices()}
        />

        <AlertDialog open={!!invoiceToDelete} onOpenChange={(open) => !open && setInvoiceToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will soft-delete invoice <strong>{invoiceToDelete?.invoiceNo}</strong>. The client and vendor
                balances will be adjusted automatically to revert the financial impact.
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
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2 inline" /> : null}
                Confirm Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PageWrapper>
  )
}
