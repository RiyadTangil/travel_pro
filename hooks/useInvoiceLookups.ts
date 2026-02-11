"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"

type Employee = { id: string; name: string; department?: string; designation?: string }
type Agent = { id: string; name: string; mobile?: string; email?: string }
type Vendor = { id: string; name: string; email?: string; mobile?: string }
type Product = { id: string; name: string }
type Airline = { id: string; name: string }
type TransportType = { id: string; name: string; active?: boolean }
type Account = { id: string; name: string; type: string; lastBalance?: number }
type Airport = { code: string; name: string; country?: string }
type Client = { id: string; name: string; uniqueId?: number; email?: string; phone?: string; presentBalance?: number; invoiceDue?: number }

let CACHE: { employees: Employee[]; agents: Agent[]; vendors: Vendor[]; products: Product[]; airlines: Airline[]; transportTypes: TransportType[]; accounts?: Account[]; airports?: Airport[]; clients?: Client[] } | null = null
let loadingPromise: Promise<any> | null = null

export function useInvoiceLookups() {
  const { data: session } = useSession()
  const [data, setData] = useState<typeof CACHE | null>(CACHE)
  const [loading, setLoading] = useState<boolean>(!CACHE)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (CACHE) { setData(CACHE); setLoading(false); return }
    if (!loadingPromise) {
      loadingPromise = fetch(`/api/invoice-lookups`, { cache: "no-store", headers: { "x-company-id": session?.user?.companyId ?? "" } })
        .then((r) => r.json())
        .then((json) => { CACHE = json; return json })
        .catch((e) => { setError(String(e)); CACHE = null })
        .finally(() => { setLoading(false) })
    }
    loadingPromise.then(() => { if (CACHE) setData(CACHE) })
  }, [session?.user?.companyId])

  return { lookups: data, loading, error }
}
