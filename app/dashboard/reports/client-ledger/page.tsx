"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DashboardHeader } from "@/components/dashboard/header"
import { format } from "date-fns"
import { Search } from "lucide-react"
import { useInvoiceLookups } from "@/hooks/useInvoiceLookups"
import { cn } from "@/lib/utils"
import { useSearchParams } from "next/navigation"
import ClientSelect from "@/components/clients/client-select"
import { DateInput } from "@/components/ui/date-input"

interface LedgerEntry {
  id: string
  date: string
  particulars: string
  voucherNo: string
  paxName: string
  pnr: string
  ticketNo: string
  route: string
  payType: string
  debit: number
  credit: number
  balance: number
  note: string
  createdDate: string
}

interface ClientDetails {
  name: string
  mobile: string
  email: string
  address: string
  note: string
}

export default function ClientLedgerPage() {
  const { lookups } = useInvoiceLookups()
  const searchParams = useSearchParams()
  const [selectedClient, setSelectedClient] = useState("")
  const [dateFrom, setDateFrom] = useState<Date | undefined>()
  const [dateTo, setDateTo] = useState<Date | undefined>()
  
  const [loading, setLoading] = useState(false)
  const [ledgerData, setLedgerData] = useState<{
    client: ClientDetails | null
    entries: LedgerEntry[]
    broughtForward: number
    totalDebit: number
    totalCredit: number
    closingBalance: number
  } | null>(null)

  // Auto-select client from URL and fetch
  useEffect(() => {
    const clientId = searchParams.get("clientId")
    if (clientId) {
      setSelectedClient(clientId)
    }
  }, [searchParams])

  // Trigger fetch when selectedClient changes (either from URL or dropdown)
  useEffect(() => {
    if (selectedClient) {
      fetchLedger()
    }
  }, [selectedClient])

  const fetchLedger = async () => {
    if (!selectedClient) return

    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.append("clientId", selectedClient)
      
      if (dateFrom) {
        params.append("dateFrom", format(dateFrom, "yyyy-MM-dd"))
      }
      if (dateTo) {
        params.append("dateTo", format(dateTo, "yyyy-MM-dd"))
      }

      const res = await fetch(`/api/reports/client-ledger?${params.toString()}`)
      const data = await res.json()
      
      if (res.ok) {
        setLedgerData(data)
      } else {
        console.error(data.error)
      }
    } catch (error) {
      console.error("Failed to fetch ledger", error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Math.abs(amount))
  }

  const getBalanceColor = (balance: number) => {
    return balance > 0 ? "text-red-500" : (balance < 0 ? "text-green-500" : "text-gray-500")
  }

  const getBalanceText = (balance: number) => {
    if (balance > 0) return `Due ${formatCurrency(balance)}`
    if (balance < 0) return `Adv ${formatCurrency(Math.abs(balance))}`
    return "0"
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="mx-auto px-4 py-4">
          <DashboardHeader />
        </div>
      </header>

      <main className="flex-grow py-6 px-4">
        <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-end justify-between">
          <div className="flex flex-col md:flex-row gap-4 w-full">
            
            {/* Client Select */}
            <div className="space-y-2 w-full md:w-[300px]">
              <Label>Select Client <span className="text-red-500">*</span></Label>
              <ClientSelect
                value={selectedClient}
                onChange={(id) => setSelectedClient(id || "")}
                preloaded={lookups?.clients}
                placeholder="Select client..."
              />
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label>Date Range</Label>
              <div className="flex gap-2">
                <DateInput value={dateFrom} onChange={setDateFrom} placeholder="From Date" />
                <DateInput value={dateTo} onChange={setDateTo} placeholder="To Date" />
              </div>
            </div>

            {/* Search Button */}
            <div className="space-y-2 flex items-end">
              <Button onClick={fetchLedger} disabled={!selectedClient || loading} className="bg-sky-500 hover:bg-sky-600">
                {loading ? "Loading..." : <><Search className="w-4 h-4 mr-2" /> Search</>}
              </Button>
            </div>
          </div>

          {/* Client Details Card */}
          {ledgerData?.client && (
            <Card className="w-full md:w-auto min-w-[300px]">
              <CardContent className="p-4">
                <h3 className="font-bold border-b pb-2 mb-2">Client Details</h3>
                <div className="grid grid-cols-[100px_1fr] gap-y-1 text-sm">
                  <span className="text-gray-500">Name</span>
                  <span className="font-medium">{ledgerData.client.name}</span>
                  <span className="text-gray-500">Mobile</span>
                  <span>{ledgerData.client.mobile}</span>
                  <span className="text-gray-500">Email</span>
                  <span>{ledgerData.client.email}</span>
                  <span className="text-gray-500">Address</span>
                  <span>{ledgerData.client.address}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Ledger Table */}
        <Card className="border-none shadow-none bg-transparent">
          <CardContent className="p-0">
            <div className="bg-white rounded-md border shadow-sm overflow-hidden overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 w-[50px]">SL.</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 w-[100px]">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Particulars</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Voucher No.</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Pax Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">PNR</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Ticket No.</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Route</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Pay Type</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Debit</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Credit</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Balance</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {/* Opening Balance Row */}
                  {ledgerData && (
                    <tr className="bg-gray-50 font-medium">
                      <td colSpan={9} className="px-4 py-2 text-right">Balance Brought Forward:</td>
                      <td className="px-4 py-2 text-right text-red-600">
                        {ledgerData.broughtForward > 0 ? formatCurrency(ledgerData.broughtForward) : ""}
                      </td>
                      <td className="px-4 py-2 text-right text-green-600">
                        {ledgerData.broughtForward < 0 ? formatCurrency(Math.abs(ledgerData.broughtForward)) : ""}
                      </td>
                      <td className={cn("px-4 py-2 text-right", getBalanceColor(ledgerData.broughtForward))}>
                        {getBalanceText(ledgerData.broughtForward)}
                      </td>
                      <td className="px-4 py-2">{ledgerData.client?.note}</td>
                    </tr>
                  )}

                  {/* Entries */}
                  {ledgerData?.entries.map((entry, index) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">{index + 1}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{entry.date ? format(new Date(entry.date), "dd MMM yyyy") : "-"}</td>
                      <td className="px-4 py-2">{entry.particulars}</td>
                      <td className="px-4 py-2 font-medium">{entry.voucherNo}</td>
                      <td className="px-4 py-2 max-w-[150px] truncate" title={entry.paxName}>{entry.paxName}</td>
                      <td className="px-4 py-2">{entry.pnr}</td>
                      <td className="px-4 py-2">{entry.ticketNo}</td>
                      <td className="px-4 py-2">{entry.route}</td>
                      <td className="px-4 py-2">{entry.payType}</td>
                      <td className="px-4 py-2 text-right text-red-600 font-medium">
                        {entry.debit > 0 ? formatCurrency(entry.debit) : ""}
                      </td>
                      <td className="px-4 py-2 text-right text-green-600 font-medium">
                        {entry.credit > 0 ? formatCurrency(entry.credit) : ""}
                      </td>
                      <td className={cn("px-4 py-2 text-right font-bold whitespace-nowrap", getBalanceColor(entry.balance))}>
                        {getBalanceText(entry.balance)}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-500 max-w-[150px] truncate" title={entry.note}>{entry.note}</td>
                    </tr>
                  ))}

                  {/* Empty State */}
                  {ledgerData?.entries.length === 0 && (
                    <tr>
                      <td colSpan={13} className="px-4 py-8 text-center text-gray-500">
                        No transactions found for the selected period.
                      </td>
                    </tr>
                  )}

                  {/* Footer Totals */}
                  {ledgerData && (
                    <tr className="bg-gray-100 font-bold border-t-2 border-gray-200">
                      <td colSpan={9} className="px-4 py-3 text-right">Total:</td>
                      <td className="px-4 py-3 text-right text-red-600">{formatCurrency(ledgerData.totalDebit)}</td>
                      <td className="px-4 py-3 text-right text-green-600">{formatCurrency(ledgerData.totalCredit)}</td>
                      <td className={cn("px-4 py-3 text-right", getBalanceColor(ledgerData.closingBalance))}>
                        {getBalanceText(ledgerData.closingBalance)}
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