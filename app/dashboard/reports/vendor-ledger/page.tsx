"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { DashboardHeader } from "@/components/dashboard/header"
import { format } from "date-fns"
import { Search } from "lucide-react"
import { useInvoiceLookups } from "@/hooks/useInvoiceLookups"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { DateRange } from "react-day-picker"
import { Calendar as CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { useSearchParams } from "next/navigation"

interface LedgerEntry {
  id: string
  date: string
  particulars: string
  voucherNo: string
  paxName: string
  ticketNo: string
  pnr: string
  route: string
  payType: string
  debit: number
  credit: number
  balance: number
  note: string
  createdDate: string
}

interface VendorDetails {
  name: string
  mobile: string
  email: string
  address: string
}

export default function VendorLedgerPage() {
  const { lookups } = useInvoiceLookups()
  const searchParams = useSearchParams()
  const [selectedVendor, setSelectedVendor] = useState("")
  const [openVendorSelect, setOpenVendorSelect] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  
  const [loading, setLoading] = useState(false)
  const [ledgerData, setLedgerData] = useState<{
    vendor: VendorDetails | null
    entries: LedgerEntry[]
    broughtForward: number
    totalDebit: number
    totalCredit: number
    closingBalance: number
  } | null>(null)

  // Auto-select vendor from URL and fetch
  useEffect(() => {
    const vendorId = searchParams.get("vendorId")
    if (vendorId) {
      setSelectedVendor(vendorId)
    }
  }, [searchParams])

  // Trigger fetch when selectedVendor changes (either from URL or dropdown)
  useEffect(() => {
    if (selectedVendor) {
      fetchLedger()
    }
  }, [selectedVendor])

  const fetchLedger = async () => {
    if (!selectedVendor) return

    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.append("vendorId", selectedVendor)
      
      if (dateRange?.from) {
        params.append("dateFrom", format(dateRange.from, "yyyy-MM-dd"))
      }
      if (dateRange?.to) {
        params.append("dateTo", format(dateRange.to, "yyyy-MM-dd"))
      }

      const res = await fetch(`/api/reports/vendor-ledger?${params.toString()}`)
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
    // Vendor Balance Logic:
    // Positive = Payable (Due to Vendor) -> Red
    // Negative = Receivable (Advance to Vendor) -> Green
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
            
            {/* Vendor Select */}
            <div className="space-y-2 w-full md:w-[300px]">
              <Label>Select Vendor <span className="text-red-500">*</span></Label>
              <Popover open={openVendorSelect} onOpenChange={setOpenVendorSelect}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openVendorSelect}
                    className="w-full justify-between"
                  >
                    {selectedVendor
                      ? lookups?.vendors?.find((v) => v.id === selectedVendor)?.name
                      : "Select vendor..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput placeholder="Search vendor..." />
                    <CommandList>
                      <CommandEmpty>No vendor found.</CommandEmpty>
                      <CommandGroup>
                        {lookups?.vendors?.map((vendor) => (
                          <CommandItem
                            key={vendor.id}
                            value={vendor.name}
                            onSelect={() => {
                              setSelectedVendor(vendor.id)
                              setOpenVendorSelect(false)
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedVendor === vendor.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {vendor.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label>Date Range</Label>
              <div className="grid gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      variant={"outline"}
                      className={cn(
                        "w-[300px] justify-start text-left font-normal",
                        !dateRange && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Search Button */}
            <div className="space-y-2 flex items-end">
              <Button onClick={fetchLedger} disabled={!selectedVendor || loading} className="bg-sky-500 hover:bg-sky-600">
                {loading ? "Loading..." : <><Search className="w-4 h-4 mr-2" /> Search</>}
              </Button>
            </div>
          </div>

          {/* Vendor Details Card */}
          {ledgerData?.vendor && (
            <Card className="w-full md:w-auto min-w-[300px]">
              <CardContent className="p-4">
                <h3 className="font-bold border-b pb-2 mb-2">Vendor Details</h3>
                <div className="grid grid-cols-[100px_1fr] gap-y-1 text-sm">
                  <span className="text-gray-500">Name</span>
                  <span className="font-medium">{ledgerData.vendor.name}</span>
                  <span className="text-gray-500">Mobile</span>
                  <span>{ledgerData.vendor.mobile}</span>
                  <span className="text-gray-500">Email</span>
                  <span>{ledgerData.vendor.email}</span>
                  <span className="text-gray-500">Address</span>
                  <span>{ledgerData.vendor.address}</span>
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
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 w-[100px]">Trxn Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Particulars</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Voucher No.</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Pax Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Ticket No</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">PNR</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Route</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Pay Type</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Debit</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Credit</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Balance</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Note</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Created Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {/* Opening Balance Row */}
                  {ledgerData && (
                    <tr className="bg-gray-50 font-medium">
                      <td colSpan={9} className="px-4 py-2 text-right">Balance Brought Forward:</td>
                      <td className="px-4 py-2 text-right">-</td>
                      <td className="px-4 py-2 text-right">-</td>
                      <td className={cn("px-4 py-2 text-right", getBalanceColor(ledgerData.broughtForward))}>
                        {getBalanceText(ledgerData.broughtForward)}
                      </td>
                      <td colSpan={2}></td>
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
                      <td className="px-4 py-2">{entry.ticketNo}</td>
                      <td className="px-4 py-2">{entry.pnr}</td>
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
                      <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">{entry.createdDate ? format(new Date(entry.createdDate), "dd MMM yyyy") : "-"}</td>
                    </tr>
                  ))}

                  {/* Empty State */}
                  {ledgerData?.entries.length === 0 && (
                    <tr>
                      <td colSpan={14} className="px-4 py-8 text-center text-gray-500">
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
                      <td colSpan={2}></td>
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