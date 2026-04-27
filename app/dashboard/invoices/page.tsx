"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { MoneyReceiptModal } from "@/components/invoices/money-receipt-modal"
import { AddInvoiceModal } from "@/components/invoices/add-invoice-modal"
import { InvoiceTable } from "@/components/invoices/invoice-table"
import { Invoice } from "@/types/invoice"
import FilterToolbar from "@/components/shared/filter-toolbar"
import { DateRange } from "react-day-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
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
import { PageWrapper } from "@/components/shared/page-wrapper"

const DEFAULT_SALES_STAFF = ["Tanvir Hasan", "Ahmed Khan", "Fatima Rahman"]

export default function InvoicesPage() {
  const { toast } = useToast()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | undefined>(undefined)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)

  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [status, setStatus] = useState("")
  const [salesBy, setSalesBy] = useState("")

  const salesByOptions = useMemo(() => {
    const fromData = Array.from(new Set(invoices.map((inv) => inv.salesBy).filter(Boolean)))
    return Array.from(new Set([...DEFAULT_SALES_STAFF, ...fromData])).sort()
  }, [invoices])

  const fetchInvoices = useCallback(
    async (overridePage?: number, overridePageSize?: number) => {
      const p = overridePage ?? page
      const ps = overridePageSize ?? pageSize
      try {
        setLoading(true)
        const params = new URLSearchParams({
          page: String(p),
          pageSize: String(ps),
          invoiceType: "other",
          search: debouncedSearch,
          status,
          salesBy,
        })
        if (dateRange?.from) params.set("dateFrom", dateRange.from.toISOString().slice(0, 10))
        if (dateRange?.to) params.set("dateTo", dateRange.to.toISOString().slice(0, 10))

        const res = await fetch(`/api/invoices?${params.toString()}`)
        const data = await res.json()

        if (!res.ok) throw new Error(data?.error || "Request failed")

        setInvoices(data.items || [])
        setTotal(Number(data.pagination?.total ?? 0))
      } catch (e) {
        console.error("Load invoices error:", e)
        toast({
          title: "Error",
          description: "Failed to load invoices",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    },
    [page, pageSize, debouncedSearch, dateRange, status, salesBy, toast]
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
  }, [page, pageSize, debouncedSearch, dateRange, status, salesBy, fetchInvoices])

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
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Delete failed")

      toast({
        title: "Success",
        description: `Invoice ${invoiceToDelete.invoiceNo} deleted successfully`,
      })

      await fetchInvoices()
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to delete invoice",
        variant: "destructive",
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

  const handleInvoiceSaved = () => {
    setPage(1)
    void fetchInvoices(1)
  }



  return (
    <PageWrapper breadcrumbs={[{ label: "Invoices" }]}>
      <div className="mx-4 mb-4 min-w-0 space-y-4">
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
            searchPlaceholder="Search invoices, clients, passports..."
            showRefresh
            onRefresh={() => void fetchInvoices()}
            className="flex-1 min-w-0"
          >
              <Button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="shrink-0 whitespace-nowrap"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Invoice
              </Button>
          </FilterToolbar>

        <InvoiceTable
          invoices={invoices}
          loading={loading}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={(p, ps) => {
            setPage(p)
            setPageSize(ps)
          }}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onMoneyReceipt={handleMoneyReceipt}
        />

        <AddInvoiceModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setEditingInvoice(undefined)
          }}
          onInvoiceAdded={handleInvoiceSaved}
          initialInvoice={editingInvoice}
        />

        <MoneyReceiptModal
          open={moneyReceiptOpen}
          onClose={() => setMoneyReceiptOpen(false)}
          invoice={selectedInvoice}
          onSubmit={() => void fetchInvoices()}
        />

        <AlertDialog open={!!invoiceToDelete} onOpenChange={(open) => !open && setInvoiceToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will soft-delete invoice <strong>{invoiceToDelete?.invoiceNo}</strong>. The client and
                vendor balances will be adjusted automatically to revert the financial impact.
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
                ) : (
                  "Confirm Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PageWrapper>
  )
}
