export interface Invoice {
  id: string
  invoiceNo: string
  clientName: string
  clientPhone: string
  salesDate: string
  dueDate: string
  salesPrice: number
  receivedAmount: number
  dueAmount: number
  mrNo: string
  passportNo: string
  salesBy: string
  agent: string
  status: 'paid' | 'partial' | 'due' | 'overdue'
  createdAt: string
  updatedAt: string
}

export interface InvoiceFormData {
  general: {
    client: string
    salesBy: string
    invoiceNo: string
    salesDate: string
    dueDate: string
    agent: string
  }
  passport: Array<{
    passportId?: string
    name: string
    passportNo: string
    paxType: string
    contactNo: string
    email: string
    dateOfBirth: string
    dateOfIssue: string
    dateOfExpire: string
  }>
  ticket: Array<{
    ticketNo: string
    pnr: string
    route: string
    referenceNo: string
    journeyDate: string
    returnDate: string
    airline: string
  }>
  hotel: Array<{
    hotelName: string
    checkInDate: string
    checkOutDate: string
    roomType: string
    referenceNo: string
  }>
  transport: Array<{
    transportType: string
    pickupTime: string
    dropoffTime: string
    referenceNo: string
  }>
  billing: {
    items: Array<{
      particulars: string
      quantity: number
      unitPrice: number
      discountPct: number
      taxPct: number
      lineTotal: number
    }>
    subtotal: number
    totalDiscount: number
    totalTax: number
    grandTotal: number
  }
  moneyReceipt: {
    receiptNo: string
    receiptDate: string
    paymentMethod: string
    currency: string
    amountPaid: number
    balance: number
    paymentReference: string
    notes: string
    receivedFrom: string
    receivedBy: string
    paidInFull: boolean
    includeTerms: boolean
  }
}

export interface InvoiceFilters {
  search: string
  status: string
  dateFrom: string
  dateTo: string
  salesBy: string
}

export interface InvoiceStats {
  totalInvoices: number
  totalSales: number
  totalReceived: number
  totalDue: number
  paidInvoices: number
  partialInvoices: number
  overdueInvoices: number
}
