"use client"

import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Controller, useFormContext } from "react-hook-form"
import { cn } from "@/lib/utils"
import { useSession } from "next-auth/react"

interface AccountOption {
  id: string
  name: string
  type: string
  lastBalance: number
}

interface MoneyReturnFieldsProps {
  type: "client" | "vendor"
  errors: any
}

export function MoneyReturnFields({ type, errors }: MoneyReturnFieldsProps) {
  const { data: session } = useSession()
  const { control, watch, setValue } = useFormContext()
  const [paymentMethods, setPaymentMethods] = useState<string[]>([])
  const [accounts, setAccounts] = useState<AccountOption[]>([])

  const prefix = type === "client" ? "clientMoneyReturn" : "vendorMoneyReturn"
  const selectedMethod = watch(`${prefix}.paymentMethod`)
  const selectedAccountId = watch(`${prefix}.accountId`)

  // Fetch Payment Methods
  useEffect(() => {
    const fetchMethods = async () => {
      try {
        const res = await fetch("/api/account-types")
        const data = await res.json()
        const items = Array.isArray(data?.items) ? data.items.map((i: any) => String(i.name)) : []
        setPaymentMethods(items.length ? items : ["Cash", "Bank", "Mobile banking", "Credit Card"])
      } catch {
        setPaymentMethods(["Cash", "Bank", "Mobile banking", "Credit Card"])
      }
    }
    fetchMethods()
  }, [])

  // Fetch Accounts
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await fetch(`/api/accounts?page=1&pageSize=100`, {
          headers: { "x-company-id": session?.user?.companyId ?? "" }
        })
        const data = await res.json()
        const items = Array.isArray(data?.items) ? data.items : []
        const mapped = items.map((i: any) => ({
          id: String(i.id || i._id),
          name: i.bankName ? `${i.name} (${i.bankName})` : String(i.name || ""),
          type: String(i.type || "Cash"),
          lastBalance: Number(i.lastBalance || 0),
        }))
        setAccounts(mapped)
      } catch (e) {
        console.error("Failed to fetch accounts", e)
      }
    }
    fetchAccounts()
  }, [session])

  const filteredAccounts = accounts.filter(a => a.type === selectedMethod)

  useEffect(() => {
    if (selectedAccountId) {
      const acc = accounts.find(a => a.id === selectedAccountId)
      if (acc) {
        setValue(`${prefix}.availableBalance`, acc.lastBalance)
      }
    } else {
      setValue(`${prefix}.availableBalance`, 0)
    }
  }, [selectedAccountId, accounts, setValue, prefix])

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
      <div className="space-y-2">
        <Label><span className="text-red-500">*</span> Payment Method</Label>
        <Controller
          name={`${prefix}.paymentMethod`}
          control={control}
          render={({ field }) => (
            <Select 
              onValueChange={(val) => {
                field.onChange(val)
                setValue(`${prefix}.accountId`, "")
              }} 
              value={field.value}
            >
              <SelectTrigger className={cn(errors?.[prefix]?.paymentMethod && "border-red-500")}>
                <SelectValue placeholder="Select Method" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-2">
        <Label><span className="text-red-500">*</span> Account</Label>
        <Controller
          name={`${prefix}.accountId`}
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value} disabled={!selectedMethod}>
              <SelectTrigger className={cn(errors?.[prefix]?.accountId && "border-red-500")}>
                <SelectValue placeholder={selectedMethod ? "Select Account" : "Select Method First"} />
              </SelectTrigger>
              <SelectContent>
                {filteredAccounts.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-2">
        <Label>Available Balance</Label>
        <Controller
          name={`${prefix}.availableBalance`}
          control={control}
          render={({ field }) => (
            <Input {...field} readOnly className="bg-gray-100" />
          )}
        />
      </div>
    </div>
  )
}
