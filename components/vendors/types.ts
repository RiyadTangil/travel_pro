export type PresentBalance = {
  type: "due" | "advance" 
  amount: number
}

export type Vendor = {
  id: string
  name: string
  email?: string
  mobilePrefix?: string
  mobile: string
  address?: string
  creditLimit?: number
  fixedAdvance?: number
  openingBalanceType?: "due" | "advance" 
  openingBalance?: number
  registrationDate?: Date
  active: boolean
  products: string[]
  presentBalance: PresentBalance
  fixedBalance?: number
  commission?: number
  amount?: number
  bankGuarantee?: string
  vendorStartDate?: Date
  vendorEndDate?: Date
  createdBy?: string
  companyId?: string | null
}

export const PRODUCT_OPTIONS: string[] = [
  "Air Ticket",
  "Airport Contract",
  "Dubai Visa",
  "Invoice Hajj",
  "Invoice(Hajj Pre Reg)",
  "Local Guide",
  "Package Tour",
  "Philippine Visa",
  "Vietnam Visa",
  "Air Ticket(Non-commission)",
  "Bus Ticket",
  "Germany Visa",
  "Invoice Hotel",
  "Invoice(Visa)",
  "Malaysia Visa",
  "PASSPORT",
  "Rail Ticket",
  "Birth Certificate",
  "Air Ticket(Re-Issue)",
  "Car Rental",
  "Indian Visa",
  "Invoice Umrah",
  "Italy Visa",
  "Medical",
  "Passport Renew",
  "Singapore Visa",
  "bKash",
]