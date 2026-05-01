"use client"

import { SharedModal } from "@/components/shared/shared-modal"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Vendor } from "./types"

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  vendor?: Vendor
}

export function VendorViewModal({ open, onOpenChange, vendor }: Props) {
  return (
    <SharedModal
      open={open}
      onOpenChange={onOpenChange}
      title="Vendor Information"
      maxWidth="max-w-4xl"
      cancelText="Close"
    >
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="details">Vendor Details</TabsTrigger>
          <TabsTrigger value="ledger">Quick Stats</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px border rounded-lg overflow-hidden bg-gray-200">
            {[
              ["Name", vendor?.name || ""],
              ["Email", vendor?.email || ""],
              ["Mobile No", `${vendor?.mobilePrefix ?? ""} ${vendor?.mobile ?? ""}`.trim()],
              ["Registration Date", vendor?.registrationDate ? new Date(vendor.registrationDate).toLocaleDateString("en-GB") : ""],
              ["Fixed Advance", String(vendor?.fixedAdvance ?? 0)],
              ["Credit Limit", String(vendor?.creditLimit ?? 0)],
              ["Vendor Address", vendor?.address ?? ""],
              ["Present Balance", vendor ? `${vendor.presentBalance.type === "due" ? "Due" : "Adv"}: ${vendor.presentBalance.amount.toLocaleString()}` : ""],
            ].map(([k, v], idx) => (
              <div key={idx} className="grid grid-cols-2 bg-white">
                <div className="bg-gray-50 p-3 border-r font-semibold text-gray-600 text-sm">{k}</div>
                <div className="p-3 text-sm text-gray-900">{v}</div>
              </div>
            ))}
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg border">
            <div className="font-bold text-gray-700 mb-3 uppercase text-xs tracking-wider">Deals In Products:</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {(vendor?.products ?? []).map((p, i) => (
                <div key={p} className="flex items-center gap-2 bg-white px-3 py-2 rounded border shadow-sm text-sm text-gray-600">
                  <span className="w-5 h-5 flex items-center justify-center bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold">{i + 1}</span>
                  {p}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
        <TabsContent value="ledger" className="pt-4">
          <div className="py-12 text-center border-2 border-dashed rounded-xl">
            <p className="text-gray-400 italic">Advanced ledger view is available in the reports section.</p>
          </div>
        </TabsContent>
      </Tabs>
    </SharedModal>
  )
}