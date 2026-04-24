"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Loader2 } from "lucide-react"
import { NonCommissionTable } from "@/components/invoices/non-commission-table"
import { MoneyReceiptModal } from "@/components/invoices/money-receipt-modal"
import { AddNonCommissionModal } from "@/components/invoices/add-non-commission-modal"
import { useToast } from "@/hooks/use-toast"
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

export default function NonCommissionInvoicesPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [status, setStatus] = useState("")
  const [salesBy, setSalesBy] = useState("")
  const [invoices, setInvoices] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editInvoiceId, setEditInvoiceId] = useState<string | null>(null)
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
        }
        if (status) queryParams.status = status
        if (salesBy) queryParams.salesBy = salesBy
        if (dateRange?.from) queryParams.dateFrom = dateRange.from.toISOString().slice(0, 10)
        if (dateRange?.to) queryParams.dateTo = dateRange.to.toISOString().slice(0, 10)

        const qs = new URLSearchParams(queryParams).toString()

        const res = await fetch(`/api/invoices/non-commission?${qs}`)
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
  }, [fetchInvoices])

  const handleRefresh = () => void fetchInvoices()

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
  const [selectedInvoiceForMR, setSelectedInvoiceForMR] = useState<any>(undefined)

  const handleMoneyReceipt = useCallback((invoice: any) => {
    setSelectedInvoiceForMR(invoice)
    setMoneyReceiptOpen(true)
  }, [])

  const salesByOptions = Array.from(
    new Set(invoices.map((inv: any) => inv.salesBy).filter(Boolean))
  ).sort() as string[]

  const filterExtras = (
    <div className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Status</Label>
        <Select
          value={status || "__all__"}
          onValueChange={(v) => {
            setStatus(v === "__all__" ? "" : v)
            setPage(1)
          }}
        >
          <SelectTrigger className="h-9 w-[130px]">
            <SelectValue placeholder="All status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All status</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="due">Due</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Sales by</Label>
        <Select
          value={salesBy || "__all__"}
          onValueChange={(v) => {
            setSalesBy(v === "__all__" ? "" : v)
            setPage(1)
          }}
        >
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue placeholder="All staff" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All staff</SelectItem>
            {salesByOptions.map((staff) => (
              <SelectItem key={staff} value={staff}>
                {staff}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )

  return (
    <PageWrapper breadcrumbs={[{ label: "Invoice" }, { label: "Non Commission" }]}>
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
          searchPlaceholder="Search invoice, client..."
          showRefresh
          onRefresh={handleRefresh}
          className="flex-1 min-w-0"
        >
          <Button
            onClick={handleCreateNew}
            className=""
          >
            <Plus className="h-4 w-4" />
            Create
          </Button>
        </FilterToolbar>


        <NonCommissionTable
          invoices={invoices}
          loading={loading}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={(newPage, newSize) => {
            setPage(newPage)
            setPageSize(newSize)
          }}
          onView={() => { }}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onMoneyReceipt={handleMoneyReceipt}
          onPartialCost={() => { }}
        />

        <AddNonCommissionModal
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
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirm Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PageWrapper>
  )
}
