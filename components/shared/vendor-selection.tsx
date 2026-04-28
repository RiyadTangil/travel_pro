"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { ClearableSelect } from "./clearable-select"

interface VendorSelectionProps {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

interface VendorOption {
  value: string
  label: string
}

export function VendorSelection({
  value,
  onChange,
  placeholder = "Filter by Vendor",
  className,
  disabled,
}: VendorSelectionProps) {
  const { data: session } = useSession()
  const companyId = session?.user?.companyId?.trim() || ""
  const [options, setOptions] = React.useState<VendorOption[]>([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (!companyId) return

    const fetchVendors = async () => {
      setLoading(true)
      try {
        const res = await fetch("/api/vendors/selection", {
          headers: { "x-company-id": companyId }
        })
        if (res.ok) {
          const data = await res.json()
          setOptions(data)
        }
      } catch (error) {
        console.error("Failed to fetch vendors for selection:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchVendors()
  }, [companyId])

  return (
    <ClearableSelect
      options={options}
      value={value}
      onChange={onChange}
      placeholder={loading ? "Loading vendors..." : placeholder}
      className={className}
      disabled={disabled || loading}
    />
  )
}
