"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2 } from "lucide-react"
import { CustomDropdown } from "./custom-dropdown"

interface BillingItem {
  id: string
  particulars: string
  quantity: number
  unitPrice: number
  discountPct: number
  taxPct: number
  lineTotal: number
}

const particularsOptions = [
  "Ticket", "Passport", "Hotel", "Transport", "Visa", "Service", "Miscellaneous"
]

const initialItem: Omit<BillingItem, 'id'> = {
  particulars: "",
  quantity: 1,
  unitPrice: 0,
  discountPct: 0,
  taxPct: 0,
  lineTotal: 0,
}

export function BillingInformation() {
  const [items, setItems] = useState<BillingItem[]>([{ id: "1", ...initialItem }])

  const addItem = () => {
    const newItem: BillingItem = { id: Date.now().toString(), ...initialItem }
    setItems(prev => [...prev, newItem])
  }

  const removeItem = (id: string) => {
    setItems(prev => prev.length > 1 ? prev.filter(i => i.id !== id) : prev)
  }

  const updateItem = (id: string, field: keyof Omit<BillingItem, 'id' | 'lineTotal'>, rawValue: string) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item
      const value = field === 'particulars' ? rawValue : Number(rawValue)
      const updated = { ...item, [field]: value } as BillingItem
      const amount = updated.quantity * updated.unitPrice
      const discountAmount = amount * (updated.discountPct / 100)
      const taxedBase = amount - discountAmount
      const taxAmount = taxedBase * (updated.taxPct / 100)
      updated.lineTotal = taxedBase + taxAmount
      return updated
    }))
  }

  const subtotal = useMemo(() => items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0), [items])
  const totalDiscount = useMemo(() => items.reduce((sum, i) => {
    const amount = i.quantity * i.unitPrice
    return sum + amount * (i.discountPct / 100)
  }, 0), [items])
  const totalTax = useMemo(() => items.reduce((sum, i) => {
    const amount = i.quantity * i.unitPrice
    const discounted = amount - amount * (i.discountPct / 100)
    return sum + discounted * (i.taxPct / 100)
  }, 0), [items])
  const grandTotal = useMemo(() => subtotal - totalDiscount + totalTax, [subtotal, totalDiscount, totalTax])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Billing Information</h3>
      </div>

      {items.map((item, index) => (
        <Card key={item.id} className="relative">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Item {index + 1}</CardTitle>
              {items.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(item.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Particulars</Label>
                <CustomDropdown
                  placeholder="Select item"
                  options={particularsOptions}
                  value={item.particulars}
                  onValueChange={(value) => updateItem(item.id, 'particulars', value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`quantity-${item.id}`}>Quantity</Label>
                <Input
                  id={`quantity-${item.id}`}
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`unitPrice-${item.id}`}>Unit Price</Label>
                <Input
                  id={`unitPrice-${item.id}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`discountPct-${item.id}`}>Discount (%)</Label>
                <Input
                  id={`discountPct-${item.id}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.discountPct}
                  onChange={(e) => updateItem(item.id, 'discountPct', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`taxPct-${item.id}`}>Tax/VAT (%)</Label>
                <Input
                  id={`taxPct-${item.id}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.taxPct}
                  onChange={(e) => updateItem(item.id, 'taxPct', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Line Total</Label>
                <Input value={item.lineTotal.toFixed(2)} readOnly />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addItem}
          className="text-blue-600 border-blue-600 hover:bg-blue-50"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="space-y-3 sm:col-span-2 lg:col-span-2 rounded-md border p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Subtotal</span>
            <span className="font-medium">{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Discount</span>
            <span className="font-medium">-{totalDiscount.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Tax/VAT</span>
            <span className="font-medium">{totalTax.toFixed(2)}</span>
          </div>
          <div className="border-t pt-2 mt-2 flex items-center justify-between">
            <span className="font-semibold">Grand Total</span>
            <span className="font-bold">{grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}