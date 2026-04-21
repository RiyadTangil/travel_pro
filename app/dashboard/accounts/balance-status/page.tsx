"use client"

import { useEffect, useState, useMemo } from "react"
import axios from "axios"
import { useSession } from "next-auth/react"
import { PageWrapper } from "@/components/shared/page-wrapper"
import { Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import BalanceStatusTable from "@/components/accounts/BalanceStatusTable"
import type { AccountItem } from "@/components/accounts/types"

export default function BalanceStatusPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<AccountItem[]>([])
  const [accountTypes, setAccountTypes] = useState<string[]>([])

  const client = useMemo(
    () =>
      axios.create({
        baseURL: "",
        headers: { "x-company-id": session?.user?.companyId ?? "" },
      }),
    [session]
  )

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await client.get("/api/accounts/balance-status")
        setItems(res.data?.items || [])
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

  const grouped = useMemo(() => {
    const groups: Record<string, AccountItem[]> = {}
    accountTypes.forEach((t) => {
      groups[t] = []
    })
    items.forEach((item) => {
      const type = item.type || "Other"
      if (!groups[type]) groups[type] = []
      groups[type].push(item)
    })
    return groups
  }, [items, accountTypes])

  const totalBalance = useMemo(() => items.reduce((sum, i) => sum + (i.lastBalance || 0), 0), [items])
  const displayTypes = Object.keys(grouped)

  return (
    <PageWrapper breadcrumbs={[{ label: "Accounts", href: "/dashboard/accounts" }, { label: "Balance Status" }]}>
      <div className="mx-4 mb-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {displayTypes.map((type) => {
              const typeItems = grouped[type] || []
              if (type === "Other" && typeItems.length === 0) return null
              return <BalanceStatusTable key={type} title={type} items={typeItems} />
            })}

            <Card className="border bg-white shadow-sm">
              <CardContent className="py-4 px-6 flex justify-end">
                <div className="text-lg font-bold text-gray-900 tabular-nums">
                  Grand total balance: {totalBalance.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PageWrapper>
  )
}
