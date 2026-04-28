"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import FilterToolbar from "@/components/shared/filter-toolbar"
import { DateRange } from "react-day-picker"
import { toast } from "sonner"
import axios from "axios"
import { useSession } from "next-auth/react"
import { PageWrapper } from "@/components/shared/page-wrapper"

import AirticketRefundTable from "@/components/refund/airticket-refund-table"
import AirticketRefundModal from "@/components/refund/airticket-refund-modal"

export default function AirticketRefundPage() {
  const { data: session } = useSession()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [refunds, setRefunds] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)

  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [search, setSearch] = useState("")

  const fetchRefunds = useCallback(async () => {
    if (!session?.user?.companyId) return

    setLoading(true)
    try {
      const params: any = {
        page,
        limit: pageSize,
        search,
      }

      if (dateRange?.from) params.startDate = dateRange.from.toISOString()
      if (dateRange?.to) params.endDate = dateRange.to.toISOString()

      const response = await axios.get("/api/refund/airticket", {
        params,
        headers: {
          "companyid": session.user.companyId
        }
      })

      setRefunds(response.data.items || [])
      setTotal(response.data.total || 0)
    } catch (error: any) {
      console.error("Error fetching refunds:", error)
      toast.error(error.response?.data?.error || "Failed to fetch refunds")
    } finally {
      setLoading(false)
    }
  }, [session?.user?.companyId, page, pageSize, search, dateRange])

  useEffect(() => {
    fetchRefunds()
  }, [fetchRefunds])

  const handleAddRefund = () => {
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!session?.user?.companyId) return

    try {
      const response = await axios.delete(`/api/refund/airticket/${id}`, {
        headers: {
          "companyid": session.user.companyId
        }
      })

      if (response.data.ok) {
        toast.success("Refund deleted successfully")
        fetchRefunds()
      } else {
        toast.error(response.data.error || "Failed to delete refund")
      }
    } catch (error: any) {
      console.error("Error deleting refund:", error)
      toast.error(error.response?.data?.error || "Failed to delete refund")
    }
  }

  return (
    <PageWrapper breadcrumbs={[{ label: "Refund" }, { label: "Airticket Refund" }]}>
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
          searchPlaceholder="Search Invoices..."
          showRefresh
          onRefresh={fetchRefunds}
          className="flex-1 min-w-0"
        >
          <Button
            type="button"
            onClick={handleAddRefund}
            className="shrink-0 whitespace-nowrap bg-[#00AEEF] hover:bg-[#008ECC]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add AirTicket Refund
          </Button>
        </FilterToolbar>

        <AirticketRefundTable
          data={refunds}
          loading={loading}
          onDelete={handleDelete}
          onView={(record) => {
            // Add view logic here if needed, or just toast for now
            toast.info(`Viewing refund: ${record.voucherNo}`)
          }}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            onChange: (p, ps) => {
              setPage(p)
              setPageSize(ps)
            }
          }}
        />

        <AirticketRefundModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false)
            fetchRefunds()
          }}
        />
      </div>
    </PageWrapper>
  )
}
