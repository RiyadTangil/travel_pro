"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { DateInput } from "@/components/ui/date-input"
import type { AccountItem, AccountType } from "./types"
import { InlineLoader } from "@/components/ui/loader"

interface AccountModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  initialItem?: AccountItem | null
  onSubmit: (payload: AccountItem) => Promise<void> | void
  submitting?: boolean
}

const accountTypes: AccountType[] = ["Cash", "Bank", "Mobile banking", "Credit Card"]

export default function AccountModal({ open, onOpenChange, initialItem, onSubmit, submitting }: AccountModalProps) {
  const [type, setType] = useState<AccountType>("Cash")
  const [name, setName] = useState("")
  const [accountNo, setAccountNo] = useState("")
  const [bankName, setBankName] = useState("")
  const [branch, setBranch] = useState("")
  const [routingNo, setRoutingNo] = useState("")
  const [cardNo, setCardNo] = useState("")
  const [cardCsv, setCardCsv] = useState("")
  const [cardExpiry, setCardExpiry] = useState<string>("")
  const [lastBalance, setLastBalance] = useState<string>("")

  useEffect(() => {
    if (open) {
      const ii = initialItem
      setType(ii?.type || "Cash")
      setName(ii?.name || "")
      setAccountNo(ii?.accountNo || "")
      setBankName(ii?.bankName || "")
      setBranch(ii?.branch || "")
      setRoutingNo(ii?.routingNo || "")
      setCardNo(ii?.cardNo || "")
      setCardCsv("")
      setCardExpiry("")
      setLastBalance(ii ? String(ii.lastBalance) : "")
    }
  }, [open, initialItem])

  const isValid = useMemo(() => {
    if (!name.trim()) return false
    if (!lastBalance.trim()) return false
    if (type === "Bank") return !!(accountNo && bankName && branch)
    if (type === "Mobile banking") return !!accountNo
    if (type === "Credit Card") return !!(cardNo)
    return true
  }, [type, name, lastBalance, accountNo, bankName, branch, cardNo])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    const payload: AccountItem = {
      id: initialItem?.id || String(Date.now()),
      type,
      name: name.trim(),
      lastBalance: Number(lastBalance || 0),
      accountNo: accountNo || undefined,
      bankName: bankName || undefined,
      branch: branch || undefined,
      routingNo: routingNo || undefined,
      cardNo: cardNo || undefined,
    }
    await onSubmit(payload)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{initialItem ? "Edit Account" : "Add Account"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Account Type <span className="text-red-500">*</span></Label>
            <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accountTypes.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Account Name <span className="text-red-500">*</span></Label>
            <Input placeholder="Account Name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          {type === "Bank" && (
            <>
              <div className="space-y-2">
                <Label>Account number <span className="text-red-500">*</span></Label>
                <Input placeholder="Account number" value={accountNo} onChange={(e) => setAccountNo(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Bank name <span className="text-red-500">*</span></Label>
                <Input placeholder="Bank name" value={bankName} onChange={(e) => setBankName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Branch <span className="text-red-500">*</span></Label>
                <Input placeholder="Branch" value={branch} onChange={(e) => setBranch(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Routing No</Label>
                <Input placeholder="Routing No" value={routingNo} onChange={(e) => setRoutingNo(e.target.value)} />
              </div>
            </>
          )}

          {type === "Mobile banking" && (
            <div className="space-y-2">
              <Label>Account number <span className="text-red-500">*</span></Label>
              <Input placeholder="Enter Your Account Number" value={accountNo} onChange={(e) => setAccountNo(e.target.value)} />
            </div>
          )}

          {type === "Credit Card" && (
            <>
              <div className="space-y-2">
                <Label>Card number <span className="text-red-500">*</span></Label>
                <Input placeholder="Enter Card Number" value={cardNo} onChange={(e) => setCardNo(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Card CSV</Label>
                <Input placeholder="Enter Card CSV" value={cardCsv} onChange={(e) => setCardCsv(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Card Expiry Date</Label>
                <DateInput value={cardExpiry ? new Date(cardExpiry) : undefined} onChange={(d) => setCardExpiry(d ? d.toISOString().slice(0,10) : "")} />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Current Last Balance</Label>
            <Input placeholder="Current Last Balance" value={lastBalance} onChange={(e) => setLastBalance(e.target.value)} />
          </div>

          <Button type="submit" className="bg-sky-500 hover:bg-sky-600" disabled={!isValid || submitting}>
            {submitting ? (
              <span className="flex items-center gap-2"><InlineLoader /> {initialItem ? "Saving" : "Creating account"}</span>
            ) : (
              initialItem ? "Save changes" : "Create account"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}