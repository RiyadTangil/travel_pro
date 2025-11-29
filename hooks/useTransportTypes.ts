"use client"

import { useEffect, useState } from "react"

export type TransportType = { id: string; name: string; active: boolean }

export function useTransportTypes(activeOnly = true, skipFetch = false) {
  const [items, setItems] = useState<TransportType[]>([])
  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    let mounted = true
    if (skipFetch) {
      setItems([])
      setLoading(false)
      return () => { mounted = false }
    }
    setLoading(true)
    fetch("/api/transport-types", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return
        const list: TransportType[] = (data?.items || []).filter((i: TransportType) => (activeOnly ? i.active : true))
        setItems(list)
      })
      .finally(() => mounted && setLoading(false))
    return () => { mounted = false }
  }, [activeOnly, skipFetch])

  return { items, loading }
}
