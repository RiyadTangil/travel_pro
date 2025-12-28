export type Option = {
  id: string
  label: string
}

export type MoneyReceipt = {
  id: string
  paymentDate: string // ISO date string
  voucherNo: string
  clientId: string
  clientName: string
  invoiceId?: string
  invoiceType: "OVERALL" | "INVOICE" | "ADVANCE" | "TICKETS" | "ADJUST"
  paymentTo: string
  paymentMethod: string
  accountId: string
  accountName: string
  manualReceiptNo?: string
  amount: number
  discount?: number
  paidAmount: number
  presentDue?: number
  note?: string
  docOneName?: string
  docTwoName?: string
  showBalance: boolean
}
