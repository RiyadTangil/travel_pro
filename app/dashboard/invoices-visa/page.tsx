"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Plus, RotateCcw, Search, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { InvoiceTable } from "@/components/invoices/invoice-table"
import { PaginationWithLinks } from "@/components/ui/pagination-with-links"
import { AddVisaInvoiceModal } from "@/components/invoices/add-visa-invoice-modal"
import { useToast } from "@/hooks/use-toast"

export default function VisaInvoicesPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
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
      const qs = new URLSearchParams({
        page: String(pagination.page),
        pageSize: String(pagination.pageSize),
        search: search,
        invoiceType: "visa",
        ...params
      }).toString()
      
      const res = await fetch(`/api/invoices?${qs}`)
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
  }, [pagination.page, pagination.pageSize, search, toast])

  useEffect(() => {
    fetchInvoices()
  }, [pagination.page, pagination.pageSize])

  const handleRefresh = () => {
    fetchInvoices()
  }

  const handleCreateNew = () => {
    setEditInvoiceId(null)
    setIsModalOpen(true)
  }

  const handleEdit = useCallback((invoice: any) => {
    setEditInvoiceId(invoice.id)
    setIsModalOpen(true)
  }, [])

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Visa Invoices</h1>
        <Button onClick={handleCreateNew} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Visa Invoice
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Search by invoice no, client name..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" onClick={handleRefresh}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="space-y-4">
          <InvoiceTable 
            invoices={invoices}
            onEdit={handleEdit}
          />
          <PaginationWithLinks
            page={pagination.page}
            pageSize={pagination.pageSize}
            totalCount={pagination.total}
            pageSizeSelectOptions={[10, 20, 50]}
          />
        </div>
      )}

      <AddVisaInvoiceModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialInvoiceId={editInvoiceId}
        onInvoiceAdded={() => fetchInvoices()}
      />
    </div>
  )
}
