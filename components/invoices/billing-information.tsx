"use client"

import { useEffect, useMemo, useState, useCallback, memo } from "react"
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
  onChange?: (payload: {
    items: BillingItem[]
    totals: { subtotal: number; discount: number; serviceCharge: number; vatTax: number; netTotal: number; agentCommission: number; invoiceDue: number; presentBalance: number; note?: string; reference?: string }
  }) => void
  initialItems?: BillingItem[]
  initialTotals?: { subtotal?: number; discount?: number; serviceCharge?: number; vatTax?: number; netTotal?: number; agentCommission?: number; invoiceDue?: number; presentBalance?: number; note?: string; reference?: string }
  vendorPreloaded?: Array<{ id: string; name: string; email?: string; mobile?: string }>
  productOptionsExternal?: string[]
}

export function BillingInformation({ onRequestAddVendor, onChange, initialItems, initialTotals, vendorPreloaded, productOptionsExternal }: BillingInformationProps) {
  const [items, setItems] = useState<BillingItem[]>([{ id: "1", ...initialItem }])
  // Always call hooks in a consistent order; avoid conditional hook calls.
  const productOptionsInternal = useProductOptions()
  const productOptions = (productOptionsExternal && productOptionsExternal.length)
    ? productOptionsExternal
    : productOptionsInternal
  const vendorPreloadedMemo = useMemo(() => (
    vendorPreloaded?.map(v => ({ id: v.id, name: v.name, email: v.email, mobile: v.mobile }))
  ), [vendorPreloaded])

  const addItem = useCallback(() => {
    const newItem: BillingItem = { id: Date.now().toString(), ...initialItem }
    setItems(prev => [...prev, newItem])
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.length > 1 ? prev.filter(i => i.id !== id) : prev)
  }, [])

  const updateItem = useCallback((id: string, field: keyof Omit<BillingItem, 'id'>, rawValue: string) => {
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === id)
      if (idx === -1) return prev
      const next = [...prev]
      const item = next[idx]
      const value = ['product', 'paxName', 'description', 'vendor'].includes(field as string) ? rawValue : Number(rawValue)
      const updated = { ...item, [field]: value } as BillingItem
      updated.totalSales = updated.quantity * updated.unitPrice
      updated.totalCost = updated.quantity * updated.costPrice
      updated.profit = updated.totalSales - updated.totalCost
      next[idx] = updated
      return next
    })
  }, [])
  const totalSalesAll = useMemo(() => items.reduce((sum, i) => sum + i.totalSales, 0), [items])
  const totalCostAll = useMemo(() => items.reduce((sum, i) => sum + i.totalCost, 0), [items])
  const totalProfitAll = useMemo(() => totalSalesAll - totalCostAll, [totalSalesAll, totalCostAll])

  const [discount, setDiscount] = useState<number>(initialTotals?.discount ?? 0)
  const [serviceCharge, setServiceCharge] = useState<number>(initialTotals?.serviceCharge ?? 0)
  const [vatTax, setVatTax] = useState<number>(initialTotals?.vatTax ?? 0)
  const netTotal = useMemo(() => totalSalesAll - discount + serviceCharge + vatTax, [totalSalesAll, discount, serviceCharge, vatTax])
  const [agentCommission, setAgentCommission] = useState<number>(initialTotals?.agentCommission ?? 0)
  const [invoiceDue, setInvoiceDue] = useState<number>(initialTotals?.invoiceDue ?? 0)
  const [presentBalance, setPresentBalance] = useState<number>(initialTotals?.presentBalance ?? 0)
  const [note, setNote] = useState<string>(initialTotals?.note ?? "")
  const [reference, setReference] = useState<string>(initialTotals?.reference ?? "")

  // When editing, apply incoming totals from API once they arrive
  useEffect(() => {
    if (!initialTotals) return
    if (typeof initialTotals.discount !== 'undefined') setDiscount(Number(initialTotals.discount) || 0)
    if (typeof initialTotals.serviceCharge !== 'undefined') setServiceCharge(Number(initialTotals.serviceCharge) || 0)
    if (typeof initialTotals.vatTax !== 'undefined') setVatTax(Number(initialTotals.vatTax) || 0)
    if (typeof initialTotals.agentCommission !== 'undefined') setAgentCommission(Number(initialTotals.agentCommission) || 0)
    if (typeof initialTotals.invoiceDue !== 'undefined') setInvoiceDue(Number(initialTotals.invoiceDue) || 0)
    if (typeof initialTotals.presentBalance !== 'undefined') setPresentBalance(Number(initialTotals.presentBalance) || 0)
    if (typeof initialTotals.note !== 'undefined') setNote(String(initialTotals.note || ''))
    if (typeof initialTotals.reference !== 'undefined') setReference(String(initialTotals.reference || ''))
  }, [initialTotals])

  useEffect(() => {
    if (initialItems && initialItems.length) {
      setItems(initialItems.map((i, idx) => ({ id: i.id || String(Date.now() + idx), ...i })))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialItems])

  useEffect(() => {
    const handle = setTimeout(() => {
      onChange?.({
        items,
        totals: { subtotal: totalSalesAll, discount, serviceCharge, vatTax, netTotal, agentCommission, invoiceDue, presentBalance, note, reference }
      })
    }, 120)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, totalSalesAll, discount, serviceCharge, vatTax, netTotal, agentCommission, invoiceDue, presentBalance, note, reference])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Billing Information</h3>
        <Button type="button" variant="outline" size="sm" onClick={addItem} className="bg-blue-500 text-white hover:bg-blue-600">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {items.map((item, index) => (
        <BillingItemRow
          key={item.id}
          item={item}
          index={index}
          canRemove={items.length > 1}
          productOptions={productOptions}
          vendorPreloaded={vendorPreloadedMemo}
          onUpdate={updateItem}
          onRemove={removeItem}
          onRequestAddVendor={onRequestAddVendor}
        />
      ))}
      {/* Bottom totals and adjustments section matching target UI */}
      <div className="rounded-md border p-4 space-y-4 bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-8 gap-4">
          <div className="space-y-2">
            <Label>Sub Total</Label>
            <Input value={totalSalesAll.toLocaleString(undefined, { maximumFractionDigits: 2 })} readOnly />
          </div>
          <div className="space-y-2">
            <Label>Discount</Label>
            <Input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value || 0))} />
          </div>
          <div className="space-y-2">
            <Label>Service Charge</Label>
            <Input type="number" value={serviceCharge} onChange={(e) => setServiceCharge(Number(e.target.value || 0))} />
          </div>
          <div className="space-y-2">
            <Label>Vat / Tax</Label>
            <Input type="number" value={vatTax} onChange={(e) => setVatTax(Number(e.target.value || 0))} />
          </div>
          <div className="space-y-2">
            <Label>Net Total</Label>
            <Input value={netTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })} readOnly />
          </div>
          <div className="space-y-2">
            <Label>Agent Commission</Label>
            <Input placeholder="Agent Commission" value={agentCommission} onChange={(e) => setAgentCommission(Number(e.target.value || 0))} />
          </div>
          <div className="space-y-2">
            <Label>Invoice Due</Label>
            <Input type="number" value={invoiceDue} onChange={(e) => setInvoiceDue(Number(e.target.value || 0))} />
          </div>
          <div className="space-y-2">
            <Label>Present Balance</Label>
            <Input type="number" value={presentBalance} onChange={(e) => setPresentBalance(Number(e.target.value || 0))} />
          </div>
        </div>


        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Note</Label>
            <Input placeholder="Note something" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Reference</Label>
            <Input placeholder="Reference" value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
        </div>
      </div>
    </div>
  )
}

type BillingItemRowProps = {
  item: BillingItem
  index: number
  canRemove: boolean
  productOptions: string[]
  vendorPreloaded?: Array<{ id: string; name: string; email?: string; mobile?: string }>
  onUpdate: (id: string, field: keyof Omit<BillingItem, 'id'>, rawValue: string) => void
  onRemove: (id: string) => void
  onRequestAddVendor?: () => void
}

const BillingItemRow = memo(function BillingItemRow({ item, index, canRemove, productOptions, vendorPreloaded, onUpdate, onRemove, onRequestAddVendor }: BillingItemRowProps) {
  return (
    <Card className="relative">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Item {index + 1}</CardTitle>
          {canRemove && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onRemove(item.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-10 gap-4">
          <div className="space-y-2">
            <Label>Product <span className="text-red-500">*</span></Label>
            <CustomDropdown
              placeholder="Select Product"
              options={productOptions}
              value={item.product}
              onValueChange={(value) => onUpdate(item.id, 'product', value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Pax Name</Label>
            <Input
              type="text"
              value={item.paxName}
              onChange={(e) => onUpdate(item.id, 'paxName', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              type="text"
              value={item.description}
              onChange={(e) => onUpdate(item.id, 'description', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`quantity-${item.id}`}>Quantity <span className="text-red-500">*</span></Label>
            <Input
              id={`quantity-${item.id}`}
              type="number"
              min="1"
              value={item.quantity}
              onChange={(e) => onUpdate(item.id, 'quantity', e.target.value)}
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
              onChange={(e) => onUpdate(item.id, 'unitPrice', e.target.value)}
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
              onChange={(e) => onUpdate(item.id, 'costPrice', e.target.value)}
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
            <Label>Vendor {item.costPrice > 0 ? <span className="text-red-500">*</span> : null}</Label>
            <VendorSelect
              value={item.vendor || undefined}
              onChange={(id) => onUpdate(item.id, 'vendor', id || "")}
              preloaded={vendorPreloaded}
              onRequestAdd={onRequestAddVendor}
              placeholder="Select Vendor"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
