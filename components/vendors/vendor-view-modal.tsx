"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Vendor } from "./types"

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  vendor?: Vendor
}

export function VendorViewModal({ open, onOpenChange, vendor }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Vendor Views</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">Vendor Details</TabsTrigger>
            <TabsTrigger value="ledger">Ledger</TabsTrigger>
          </TabsList>
          <TabsContent value="details">
            <div className="mt-4 grid grid-cols-2 gap-px border rounded-md overflow-hidden">
              {[
                ["Name", vendor?.name || ""],
                ["Email", vendor?.email || ""],
                ["Mobile No", `${vendor?.mobilePrefix ?? ""} ${vendor?.mobile ?? ""}`.trim()],
                ["Commission", String(vendor?.commission ?? 0)],
                ["Amount", vendor?.amount !== undefined ? String(vendor.amount) : ""],
                ["Fixed Advance", String(vendor?.fixedAdvance ?? 0)],
                ["Credit Limit", String(vendor?.creditLimit ?? 0)],
                ["Vendor Address", vendor?.address ?? ""],
                ["Bank Guarantee", vendor?.bankGuarantee ?? ""],
                ["Vendor start date", vendor?.vendorStartDate ? vendor?.vendorStartDate.toDateString() : ""],
                ["Vendor end date", vendor?.vendorEndDate ? vendor?.vendorEndDate.toDateString() : ""],
                ["Registration Date", vendor?.registrationDate ? new Date(vendor.registrationDate).toDateString() : ""],

                ["Created By", vendor?.createdBy ?? ""],
              ].map(([k, v], idx) => (
                <div key={idx} className="grid grid-cols-2">
                  <div className="bg-muted/50 p-2 border-b border-r font-medium">{k}</div>
                  <div className="p-2 border-b">{v}</div>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <div className="font-semibold mb-2">Vendor Products:</div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                {(vendor?.products ?? []).map((p, i) => (
                  <div key={p}>{i + 1}. {p}</div>
                ))}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="ledger">
            <div className="text-sm text-muted-foreground">Ledger view is not implemented in this mock.</div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}