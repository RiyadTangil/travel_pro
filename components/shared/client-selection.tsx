"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { ClearableSelect } from "./clearable-select"

interface ClientSelectionProps {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

interface ClientOption {
  value: string
  label: string
}

export function ClientSelection({
  value,
  onChange,
  placeholder = "Filter by Client",
  className,
  disabled,
}: ClientSelectionProps) {
  const { data: session } = useSession()
  const companyId = session?.user?.companyId?.trim() || ""
  const [options, setOptions] = React.useState<ClientOption[]>([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (!companyId) return

    const fetchClients = async () => {
      setLoading(true)
      try {
        const res = await fetch("/api/clients/selection", {
          headers: { "x-company-id": companyId }
        })
        if (res.ok) {
          const data = await res.json()
          setOptions(data)
        }
      } catch (error) {
        console.error("Failed to fetch clients for selection:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchClients()
  }, [companyId])

  return (
    <ClearableSelect
      options={options}
      value={value}
      onChange={onChange}
      placeholder={loading ? "Loading clients..." : placeholder}
      className={className}
      disabled={disabled || loading}
    />
  )
}
