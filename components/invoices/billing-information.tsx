"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2 } from "lucide-react"
import { CustomDropdown } from "./custom-dropdown"
import VendorSelect from "@/components/vendors/vendor-select"

interface BillingItem {
  id: string
  product: string
  paxName: string
  description: string
  quantity: number
  unitPrice: number
  costPrice: number
  totalSales: number
  totalCost: number
  profit: number
  vendor: string
}

// Product options are loaded from Products API to keep it in sync with /dashboard/products
// Users can still add ad-hoc items via CustomDropdown's add-new capability
// The dropdown internally syncs when options change
const staticFallbackProducts = ["Ticket", "Passport", "Hotel", "Transport", "Visa", "Service", "Miscellaneous"]
const useProductOptions = () => {
  const [options, setOptions] = useState<string[]>(staticFallbackProducts)
  useEffect(() => {
    let active = true
    const controller = new AbortController()
    const loadProducts = async () => {
      try {
        const res = await fetch(`/api/products?page=1&pageSize=200`, { signal: controller.signal })
        const json = await res.json()
        const names: string[] = (json.data || [])
          .filter((p: any) => p.product_status === 1 && !p.products_is_deleted)
          .map((p: any) => String(p.product_name))
        const deduped = Array.from(new Set(names))
        if (active && deduped.length) setOptions(deduped)
      } catch (e) {
        // keep fallback options
      }
    }
    loadProducts()
    return () => { active = false; controller.abort() }
  }, [])
  return options
}

const vendorOptions = [
  "Airlines", "Agency", "Hotel", "Transport", "Other"
]

const initialItem: Omit<BillingItem, 'id'> = {
  product: "",
  paxName: "",
  description: "",
  quantity: 1,
  unitPrice: 0,
  costPrice: 0,
  totalSales: 0,
  totalCost: 0,
  profit: 0,
  vendor: "",
}

interface BillingInformationProps {
  onRequestAddVendor?: () => void
}

export function BillingInformation({ onRequestAddVendor }: BillingInformationProps) {
  const [items, setItems] = useState<BillingItem[]>([{ id: "1", ...initialItem }])
  const productOptions = useProductOptions()

  const addItem = () => {
    const newItem: BillingItem = { id: Date.now().toString(), ...initialItem }
    setItems(prev => [...prev, newItem])
  }

  const removeItem = (id: string) => {
    setItems(prev => prev.length > 1 ? prev.filter(i => i.id !== id) : prev)
  }

  const updateItem = (id: string, field: keyof Omit<BillingItem, 'id'>, rawValue: string) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item
      const value = ['product','paxName','description','vendor'].includes(field as string) ? rawValue : Number(rawValue)
      const updated = { ...item, [field]: value } as BillingItem
      updated.totalSales = updated.quantity * updated.unitPrice
      updated.totalCost = updated.quantity * updated.costPrice
      updated.profit = updated.totalSales - updated.totalCost
      return updated
    }))
  }
  const totalSalesAll = useMemo(() => items.reduce((sum, i) => sum + i.totalSales, 0), [items])
  const totalCostAll = useMemo(() => items.reduce((sum, i) => sum + i.totalCost, 0), [items])
  const totalProfitAll = useMemo(() => totalSalesAll - totalCostAll, [totalSalesAll, totalCostAll])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Billing Information</h3>
        <Button type="button" variant="outline" size="sm" onClick={addItem} className="bg-blue-500 text-white hover:bg-blue-600">
          <Plus className="h-4 w-4" />
        </Button>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
              <div className="space-y-2">
                <Label>Product <span className="text-red-500">*</span></Label>
                <CustomDropdown
                  placeholder="Select Product"
                  options={productOptions}
                  value={item.product}
                  onValueChange={(value) => updateItem(item.id, 'product', value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Pax Name</Label>
                <Input
                  type="text"
                  value={item.paxName}
                  onChange={(e) => updateItem(item.id, 'paxName', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  type="text"
                  value={item.description}
                  onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`quantity-${item.id}`}>Quantity <span className="text-red-500">*</span></Label>
                <Input
                  id={`quantity-${item.id}`}
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`unitPrice-${item.id}`}>Unit Price <span className="text-red-500">*</span></Label>
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
                <Label htmlFor={`costPrice-${item.id}`}>Cost Price</Label>
                <Input
                  id={`costPrice-${item.id}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.costPrice}
                  onChange={(e) => updateItem(item.id, 'costPrice', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Total Sales</Label>
                <Input value={item.totalSales.toFixed(2)} readOnly />
              </div>

              <div className="space-y-2">
                <Label>Total Cost</Label>
                <Input value={item.totalCost.toFixed(2)} readOnly />
              </div>

              <div className="space-y-2">
                <Label>Profit</Label>
                <Input value={item.profit.toFixed(2)} readOnly />
              </div>

              <div className="space-y-2">
                <Label>Vendor</Label>
                <VendorSelect
                  value={item.vendor || undefined}
                  onChange={(id) => updateItem(item.id, 'vendor', id || "")}
                  onRequestAdd={onRequestAddVendor}
                  placeholder="Select Vendor"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="space-y-3 rounded-md border p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Total Sales</span>
            <span className="font-medium">{totalSalesAll.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Total Cost</span>
            <span className="font-medium">{totalCostAll.toFixed(2)}</span>
          </div>
          <div className="border-t pt-2 mt-2 flex items-center justify-between">
            <span className="font-semibold">Profit</span>
            <span className="font-bold">{totalProfitAll.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}