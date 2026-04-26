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
type Client = {
  id: string
  name: string
  uniqueId?: number
  email?: string
  phone?: string
  presentBalance?: number
  invoiceDue?: number
}

export type InvoiceLookupsData = {
  employees: Employee[]
  agents: Agent[]
  vendors: Vendor[]
  products: Product[]
  airlines: Airline[]
  transportTypes: TransportType[]
  accounts?: Account[]
  airports?: Airport[]
  clients?: Client[]
  passports?: unknown[]
}

const cacheByCompany = new Map<string, InvoiceLookupsData>()
const inFlightByCompany = new Map<string, Promise<InvoiceLookupsData>>()

export function useInvoiceLookups() {
  const { data: session } = useSession()
  const companyId = session?.user?.companyId?.trim() || ""
  const [data, setData] = useState<InvoiceLookupsData | null>(companyId ? cacheByCompany.get(companyId) ?? null : null)
  const [loading, setLoading] = useState<boolean>(() => !!(companyId && !cacheByCompany.has(companyId)))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!companyId) {
      setData(null)
      setLoading(false)
      setError(null)
      return
    }

    const cached = cacheByCompany.get(companyId)
    if (cached) {
      setData(cached)
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    let p = inFlightByCompany.get(companyId)
    if (!p) {
      p = fetch(`/api/invoice-lookups`, {
        cache: "no-store",
        headers: { "x-company-id": companyId },
      })
        .then(async (r) => {
          const json = await r.json()
          if (!r.ok) {
            throw new Error(json?.error || `HTTP ${r.status}`)
          }
          return json as InvoiceLookupsData
        })
        .then((json) => {
          cacheByCompany.set(companyId, json)
          return json
        })
        .finally(() => {
          inFlightByCompany.delete(companyId)
        })
      inFlightByCompany.set(companyId, p)
    }

    p.then((json) => {
      if (!cancelled) {
        setData(json)
        setError(null)
      }
    }).catch((e) => {
      if (!cancelled) {
        setError(String(e))
        setData(null)
      }
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [companyId])

  return { lookups: data, loading, error }
}
