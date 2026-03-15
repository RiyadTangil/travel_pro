"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Plus, RotateCcw, Search, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { NonCommissionTable } from "@/components/invoices/non-commission-table"
import { PaginationWithLinks } from "@/components/ui/pagination-with-links"
import { DateRangePicker } from "@/components/ui/date-range-picker" // Assuming this exists or using Input[type=date]

// Dummy data based on the provided image
import { AddNonCommissionModal } from "@/components/invoices/add-non-commission-modal"
import { useToast } from "@/hooks/use-toast"
import { useEffect } from "react"

export default function NonCommissionInvoicesPage() {
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
        ...params
      }).toString()
      
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
  }, [pagination.page, pagination.pageSize, search, toast])

  useEffect(() => {
    fetchInvoices()
  }, [pagination.page, pagination.pageSize])

  const handleRefresh = () => {
    fetchInvoices()
  }

  const handleCreate = () => {
    setIsModalOpen(true)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPagination(prev => ({ ...prev, page: 1 }))
    fetchInvoices({ page: 1 })
  }

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  const handleEdit = (invoice: any) => {
    setEditInvoiceId(invoice.id)
    setIsModalOpen(true)
  }

  const handleCreateNew = () => {
    setEditInvoiceId(null)
    setIsModalOpen(true)
  }

  return (
    <div className="space-y-6 p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span className="hover:text-blue-600 cursor-pointer">Dashboard</span>
        <span>&gt;</span>
        <span className="hover:text-blue-600 cursor-pointer">Invoice</span>
        <span>&gt;</span>
        <span className="text-gray-900 font-medium">Non Commission</span>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button 
            onClick={handleCreateNew}
            className="bg-sky-400 hover:bg-sky-500 text-white rounded-md h-10 px-6 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleRefresh}
            className="text-gray-400 hover:text-gray-600"
          >
            <RotateCcw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center border rounded-md px-3 bg-white h-10 w-[280px]">
            <input 
              type="text" 
              placeholder="Start date" 
              className="w-full text-sm outline-none bg-transparent"
            />
            <span className="text-gray-300 mx-2">→</span>
            <input 
              type="text" 
              placeholder="End date" 
              className="w-full text-sm outline-none bg-transparent"
            />
            <span className="ml-2 text-gray-400">📅</span>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Invoices..." 
              className="pl-10 h-10 w-[280px] bg-white border-gray-200"
            />
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
          </div>
        )}
        <NonCommissionTable
          invoices={invoices}
          onView={(inv) => console.log("View", inv)}
          onEdit={handleEdit}
          onDelete={(inv) => console.log("Delete", inv)}
          onMoneyReceipt={(inv) => console.log("MR", inv)}
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
      </div>

        <AddNonCommissionModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onInvoiceAdded={() => fetchInvoices()}
          initialInvoiceId={editInvoiceId}
        />
    </div>
  )
}
