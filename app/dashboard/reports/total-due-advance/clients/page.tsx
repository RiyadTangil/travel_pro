
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { DashboardHeader } from "@/components/dashboard/header"
import { format } from "date-fns"
import { Search, Printer, FileSpreadsheet } from "lucide-react"
import { useInvoiceLookups } from "@/hooks/useInvoiceLookups"
import { cn } from "@/lib/utils"
import { useSearchParams, useRouter } from "next/navigation"
import ClientSelect from "@/components/clients/client-select"
import { DateInput } from "@/components/ui/date-input"

type ClientRow = {
  clientId: string
  name: string
  mobile: string
  email: string
  presentDue: number
  presentAdvance: number
  lastBalance: number
  creditLimit: number
}

export default function TotalDueAdvanceClientPage() {
  const { lookups } = useInvoiceLookups()
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [selectedClient, setSelectedClient] = useState<string>("all")
  const [date, setDate] = useState<Date | undefined>(new Date())
  
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<ClientRow[]>([])

  const clientsList = useMemo(() => {
    const list = lookups?.clients || []
    return [{ id: "all", name: "ALL", uniqueId: 0 }, ...list]
  }, [lookups?.clients])

  // Init from URL
  useEffect(() => {
    const cid = searchParams.get("clientId")
    const d = searchParams.get("date")
    if (cid) setSelectedClient(cid)
    if (d) setDate(new Date(d))
  }, [searchParams])

  const handleSearch = async () => {
    if (!date) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedClient && selectedClient !== "all") params.set("clientId", selectedClient)
      params.set("date", format(date, "yyyy-MM-dd"))
      
      // Update URL without reload
      router.push(`?${params.toString()}`)

      const res = await fetch(`/api/reports/total-due-advance/clients?${params.toString()}`)
      const data = await res.json()
      if (Array.isArray(data)) {
        setRows(data)
      } else {
        setRows([])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Initial load if date is present
  useEffect(() => {
    if (date) {
        if (searchParams.get("date")) {
            handleSearch()
        }
    }
  }, []) 

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
  }

  const totalDue = rows.reduce((sum, r) => sum + r.presentDue, 0)
  const totalAdvance = rows.reduce((sum, r) => sum + r.presentAdvance, 0)
  const totalLastBalance = rows.reduce((sum, r) => sum + r.lastBalance, 0)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="mx-auto px-4 py-4">
          <DashboardHeader />
        </div>
      </header>

      <main className="flex-grow py-6 px-4">
        <div className="flex items-center gap-2 mb-6 text-sm text-gray-500">
             <span>Dashboard</span> <span>&gt;</span> <span>Report</span> <span>&gt;</span> <span className="font-medium text-gray-900">Total Due/Advance (Client)</span>
        </div>

        <div className="mb-6 flex flex-col md:flex-row gap-4 items-end justify-between">
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto items-end">
            
            {/* Client Select */}
            <div className="space-y-1 w-full md:w-[300px]">
              <Label className="text-xs text-red-500 font-normal">* Select Client</Label>
              <ClientSelect
                value={selectedClient}
                onChange={(id) => setSelectedClient(id || "all")}
                preloaded={clientsList}
                placeholder="Select Client"
              />
            </div>

            {/* Date Select */}
            <div className="space-y-1 w-full md:w-[240px]">
              <Label className="text-xs text-red-500 font-normal">* Select Date</Label>
              <DateInput 
                value={date} 
                onChange={setDate} 
                placeholder="Pick a date"
              />
            </div>

            {/* Search Button */}
            <div className="pb-0">
              <Button onClick={handleSearch} disabled={!date || loading} className="bg-sky-400 hover:bg-sky-500 text-white w-full md:w-auto">
                {loading ? "Searching..." : <><Search className="w-4 h-4 mr-2" /> Search</>}
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4 md:mt-0">
             <Button variant="outline" className="bg-sky-400 hover:bg-sky-500 text-white border-none"><Printer className="w-4 h-4 mr-2"/> Print</Button>
             <Button variant="outline" className="bg-sky-400 hover:bg-sky-500 text-white border-none"><FileSpreadsheet className="w-4 h-4 mr-2"/> Excel Report</Button>
          </div>
        </div>
        
        <div className="mb-4">
            <h2 className="text-lg font-semibold">Total Due/Advance (Client)</h2>
            <p className="text-sm text-gray-500 mt-2">You have total: Results</p>
        </div>

        {/* Table */}
        <Card className="border-none shadow-none bg-transparent">
          <CardContent className="p-0">
            <div className="bg-white rounded-md border shadow-sm overflow-hidden overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 w-[50px]">SL.</th>
                    <th className="px-4 py-3 text-left font-semibold text-blue-600">Client Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Mobile No.</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Email No.</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Present Due</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Present Advance</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Last Balance</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Credit Limit</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.length === 0 ? (
                    <tr>
                        <td colSpan={8} className="h-40 text-center text-gray-500">
                             <div className="flex flex-col items-center justify-center">
                                {/* Placeholder Icon */}
                                <div className="text-4xl mb-2">📂</div>
                                No data
                             </div>
                        </td>
                    </tr>
                  ) : (
                    rows.map((row, index) => (
                        <tr key={row.clientId} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-600">{index + 1}</td>
                            <td className="px-4 py-3 text-blue-500">{row.name}</td>
                            <td className="px-4 py-3 text-gray-600">{row.mobile}</td>
                            <td className="px-4 py-3 text-gray-600">{row.email}</td>
                            <td className="px-4 py-3 text-right text-red-500">{formatCurrency(row.presentDue)}</td>
                            <td className="px-4 py-3 text-right text-green-500">{formatCurrency(row.presentAdvance)}</td>
                            <td className={cn("px-4 py-3 text-right", row.lastBalance > 0 ? "text-red-500" : "text-green-500")}>
                                {formatCurrency(Math.abs(row.lastBalance))}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-600">{row.creditLimit ? formatCurrency(row.creditLimit) : "N/A"}</td>
                        </tr>
                    ))
                  )}

                  {/* Totals Row */}
                  {rows.length > 0 && (
                     <tr className="bg-white font-bold border-t">
                        <td colSpan={4} className="px-4 py-3 text-right text-gray-800">Total Due & Advance</td>
                        <td className="px-4 py-3 text-right text-red-500">{formatCurrency(totalDue)}</td>
                        <td className="px-4 py-3 text-right text-green-500">{formatCurrency(totalAdvance)}</td>
                        <td className={cn("px-4 py-3 text-right", totalLastBalance > 0 ? "text-red-500" : "text-green-500")}>
                            {formatCurrency(Math.abs(totalLastBalance))}
                        </td>
                        <td></td>
                     </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
