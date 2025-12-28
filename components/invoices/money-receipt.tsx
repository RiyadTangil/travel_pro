"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CustomDropdown } from "./custom-dropdown"
import { DateInput } from "@/components/ui/date-input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { AccountType } from "@/components/accounts/types"

type AccountOptionItem = { id: string; name: string; type: AccountType }

function useAccountOptions(preloaded?: AccountOptionItem[]) {
  const [options, setOptions] = useState<AccountOptionItem[]>([])
  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        if (preloaded && preloaded.length) {
          if (active) setOptions(preloaded)
          return
        }
        const res = await fetch(`/api/accounts?pageSize=200`)
        const json = await res.json()
        const list: AccountOptionItem[] = (json.items || []).map((a: any) => ({ id: String(a.id || a._id || a.name), name: String(a.name), type: String(a.type) as AccountType }))
        if (active) setOptions(list)
      } catch {}
    }
    load()
    return () => { active = false }
  }, [preloaded])
  return options
}

export function MoneyReceipt({ accountsPreloaded }: { accountsPreloaded?: AccountOptionItem[] }) {
  const accounts = useAccountOptions(accountsPreloaded)
  const [paymentMethod, setPaymentMethod] = useState<AccountType | "">("")
  const [paymentMethodOptions, setPaymentMethodOptions] = useState<AccountType[]>([])
  const [account, setAccount] = useState("")
  const [amount, setAmount] = useState<string>("")
  const [discount, setDiscount] = useState<string>("")
  const [transNo, setTransNo] = useState<string>("")
  const [paymentDate, setPaymentDate] = useState<string>("")
  const [receiptNo, setReceiptNo] = useState<string>("")
  const [note, setNote] = useState<string>("")
  const [showPrevDue, setShowPrevDue] = useState<string>("no")
  const [showDiscount, setShowDiscount] = useState<string>("yes")

  const isRequired = !!paymentMethod
  const filteredAccountNames = useMemo(() => (
    accounts
      .filter(a => (paymentMethod ? a.type === paymentMethod : false))
      .map(a => a.name)
  ), [accounts, paymentMethod])

  useEffect(() => {
    let active = true
    const ctrl = new AbortController()
    ;(async () => {
      try {
        const res = await fetch(`/api/account-types`, { signal: ctrl.signal })
        const data = await res.json()
        const items: string[] = Array.isArray(data?.items) ? data.items.map((i: any) => String(i.name)) : []
        if (active) setPaymentMethodOptions(items.length ? items : ["Cash", "Bank", "Mobile banking", "Credit Card"])
      } catch {
        if (active) setPaymentMethodOptions(["Cash", "Bank", "Mobile banking", "Credit Card"])
      }
    })()
    return () => { active = false; ctrl.abort() }
  }, [])

  useEffect(() => {
    // Reset account and transNo when payment method changes
    if (paymentMethod) {
      if (!filteredAccountNames.includes(account)) setAccount("")
    } else {
      setAccount("")
      setTransNo("")
    }
  }, [paymentMethod])

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Money Receipt</h3>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Money Receipt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border bg-gray-50 p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
              <div className="space-y-2">
                <Label>Payment Method {isRequired && <span className="text-red-500">*</span>}</Label>
                <CustomDropdown
                  placeholder="Select Payment Method"
                  options={paymentMethodOptions}
                  value={paymentMethod}
                  onValueChange={useCallback((v) => setPaymentMethod(v as AccountType || ""), [])}
                />
              </div>
              <div className="space-y-2">
                <Label>Account: {isRequired && <span className="text-red-500">*</span>}</Label>
                <CustomDropdown
                  placeholder="Select Account"
                  options={filteredAccountNames}
                  value={account}
                  onValueChange={useCallback(setAccount, [])}
                  disabled={!paymentMethod}
                />
              </div>
              {paymentMethod === "Mobile banking" && (
                <div className="space-y-2">
                  <Label>Trans No: {isRequired && <span className="text-red-500">*</span>}</Label>
                  <Input placeholder="Trans No:" value={transNo} onChange={useCallback((e) => setTransNo(e.target.value), [])} />
                </div>
              )}
              <div className="space-y-2">
                <Label>Amount: {isRequired && <span className="text-red-500">*</span>}</Label>
                <Input placeholder="Amount" value={amount} onChange={useCallback((e) => setAmount(e.target.value), [])} />
              </div>
              <div className="space-y-2">
                <Label>Discount:</Label>
                <Input placeholder="Discount" value={discount} onChange={useCallback((e) => setDiscount(e.target.value), [])} />
              </div>
              <div className="space-y-2">
                <Label>Payment Date: {isRequired && <span className="text-red-500">*</span>}</Label>
                <DateInput value={paymentDate ? new Date(paymentDate) : undefined} onChange={(d) => setPaymentDate(d ? d.toISOString().slice(0,10) : "")} />
              </div>
              <div className="space-y-2">
                <Label>Reciept no</Label>
                <Input placeholder="Reciept no" value={receiptNo} onChange={useCallback((e) => setReceiptNo(e.target.value), [])} />
              </div>
              <div className="space-y-2">
                <Label>Note:</Label>
                <Input placeholder="Note" value={note} onChange={useCallback((e) => setNote(e.target.value), [])} />
              </div>
            </div>

            <div className="flex items-start justify-end gap-10">
              <div>
                <Label className="mb-2 block">Show Prev Due in this invoice?</Label>
                <RadioGroup value={showPrevDue} onValueChange={useCallback(setShowPrevDue, [])} className="flex items-center gap-6">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="prevdue-yes" />
                    <Label htmlFor="prevdue-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="prevdue-no" />
                    <Label htmlFor="prevdue-no">No</Label>
                  </div>
                </RadioGroup>
              </div>
              <div>
                <Label className="mb-2 block">Show discount in this invoice?</Label>
                <RadioGroup value={showDiscount} onValueChange={useCallback(setShowDiscount, [])} className="flex items-center gap-6">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="discount-yes" />
                    <Label htmlFor="discount-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="discount-no" />
                    <Label htmlFor="discount-no">No</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
