"use client"

import { useEffect, useState, useMemo } from "react"
import axios from "axios"
import { useSession } from "next-auth/react"
import { DashboardHeader } from "@/components/dashboard/header"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Loader2 } from "lucide-react"
import BalanceStatusTable from "@/components/accounts/BalanceStatusTable"
import type { AccountItem } from "@/components/accounts/types"

export default function BalanceStatusPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<AccountItem[]>([])
  const [accountTypes, setAccountTypes] = useState<string[]>([])

  const client = useMemo(() => axios.create({
    baseURL: "",
    headers: { "x-company-id": session?.user?.companyId ?? "" },
  }), [session])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await client.get("/api/accounts/balance-status")
        setItems(res.data?.items || [])
        // Extract names from returned types objects
        const types = Array.isArray(res.data?.types) ? res.data.types.map((t: any) => t.name) : []
        setAccountTypes(types)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [client])

  // Group items by type
  const grouped = useMemo(() => {
    const groups: Record<string, AccountItem[]> = {}
    
    // Initialize groups based on dynamic types
    accountTypes.forEach(t => { groups[t] = [] })

    // Also handle any items that might have a type not in the fetched list (fallback)
    items.forEach(item => {
       const type = item.type || "Other"
       if (!groups[type]) groups[type] = []
       groups[type].push(item)
    })
    
    return groups
  }, [items, accountTypes])

  const totalBalance = useMemo(() => items.reduce((sum, i) => sum + (i.lastBalance || 0), 0), [items])

  // Display all types found in API + any extras from items
  const displayTypes = Object.keys(grouped)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="mx-auto px-4 py-4">
          <DashboardHeader />
        </div>
      </header>

      <main className="flex-grow py-6">
        <div className="mb-4 px-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard/accounts">Accounts</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Balance Status</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="mx-4 mb-6">
           {/* No add button or filters requested, just the status view */}
        </div>

        <div className="mx-4">
          {loading ? (
             <div className="flex justify-center py-20">
               <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
             </div>
          ) : (
            <>
              {displayTypes.map(type => {
                 const typeItems = grouped[type] || []
                 // Show all types returned by API even if empty, but for "Other" only if has items
                 if (type === "Other" && typeItems.length === 0) return null
                 
                 return (
                   <BalanceStatusTable 
                     key={type} 
                     title={type} 
                     items={typeItems} 
                   />
                 )
              })}

              <div className="mt-8 flex justify-end">
                 <div className="text-xl font-bold text-gray-800">
                    Total Balance : {totalBalance.toLocaleString()}
                 </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
