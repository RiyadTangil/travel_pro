"use client"

import { useEffect, useState } from "react"

type Employee = { id: string; name: string; department?: string; designation?: string }
type Agent = { id: string; name: string; mobile?: string; email?: string }
type Vendor = { id: string; name: string; email?: string; mobile?: string }
type Product = { id: string; name: string }
type Airline = { id: string; name: string }
type TransportType = { id: string; name: string; active?: boolean }
type Account = { id: string; name: string; type: string }
type Airport = { code: string; name: string; country?: string }

let CACHE: { employees: Employee[]; agents: Agent[]; vendors: Vendor[]; products: Product[]; airlines: Airline[]; transportTypes: TransportType[]; accounts?: Account[]; airports?: Airport[] } | null = null
let loadingPromise: Promise<any> | null = null

export function useInvoiceLookups() {
  const [data, setData] = useState<typeof CACHE | null>(CACHE)
  const [loading, setLoading] = useState<boolean>(!CACHE)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (CACHE) { setData(CACHE); setLoading(false); return }
    if (!loadingPromise) {
      loadingPromise = fetch(`/api/invoice-lookups`, { cache: "no-store" })
        .then((r) => r.json())
        .then((json) => { CACHE = json; return json })
        .catch((e) => { setError(String(e)); CACHE = null })
        .finally(() => { setLoading(false) })
    }
    loadingPromise.then(() => { if (CACHE) setData(CACHE) })
  }, [])

  return { lookups: data, loading, error }
}
