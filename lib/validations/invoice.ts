import { z } from "zod"

// ─── Shared primitives ────────────────────────────────────────────────────────

const ObjectIdString = z
  .string()
  .trim()
  .regex(/^[0-9a-fA-F]{24}$/, "Must be a valid 24-character ObjectId")

const OptionalObjectId = ObjectIdString.optional().or(z.literal("")).transform(v => v || undefined)

const NonNegative = z.number({ invalid_type_error: "Must be a number" }).min(0).default(0)
const DateString = z.string().trim().min(1, "Date is required")

// ─── Money Receipt sub-schema (inline with invoice creation) ─────────────────

export const InlineMoneyReceiptSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  paymentMethod: z.string().trim().min(1, "Payment method is required"),
  accountId: ObjectIdString,
  paymentDate: z.string().optional(),
  discount: NonNegative,
  note: z.string().optional().default(""),
  receiptNo: z.string().optional().default(""),
}).strict()

// ─── Billing item — standard / visa ──────────────────────────────────────────

export const BillingItemSchema = z.object({
  /**
   * `product` holds the product's ObjectId string (from the dropdown) OR a
   * free-text product name.  When it IS a valid ObjectId it is also stored as
   * `productId` in InvoiceItem so we can do relational lookups.
   */
  product: z.string().trim().default(""),
  paxName: z.string().trim().default(""),
  description: z.string().trim().default(""),
  quantity: z.number().min(0).default(1),
  unitPrice: NonNegative,
  costPrice: NonNegative,
  totalSales: NonNegative,
  totalCost: NonNegative,
  profit: z.number().default(0),
  /** VendorId ObjectId string — required by back-end to update vendor balance */
  vendor: z.string().trim().default(""),
  /** Visa-specific optional fields */
  country: z.string().optional(),
  visaType: z.string().optional(),
  visaDuration: z.string().optional(),
  token: z.string().optional(),
  delivery: z.string().optional(),
  visaNo: z.string().optional(),
  mofaNo: z.string().optional(),
  okalaNo: z.string().optional(),
}).transform(item => ({
  ...item,
  /** Derive productId deterministically — never guess */
  productId: /^[0-9a-fA-F]{24}$/.test(item.product) ? item.product : undefined,
}))

export const BillingSummarySchema = z.object({
  items: z.array(BillingItemSchema).min(1, "At least one billing item is required"),
  subtotal: NonNegative,
  totalCost: NonNegative,
  discount: NonNegative,
  serviceCharge: NonNegative,
  vatTax: NonNegative,
  netTotal: z.number().positive("Net total must be positive"),
  note: z.string().default(""),
  reference: z.string().default(""),
})

// ─── Passport / ticket / hotel / transport sub-schemas ───────────────────────

const PassportEntrySchema = z.object({
  passportNo: z.string().optional().default(""),
  name: z.string().optional().default(""),
  paxType: z.string().optional().default(""),
  contactNo: z.string().optional().default(""),
  email: z.string().optional().default(""),
  dateOfBirth: z.string().optional(),
  dateOfIssue: z.string().optional(),
  dateOfExpire: z.string().optional(),
  passportId: z.string().optional(),
}).passthrough()

const TicketEntrySchema = z.object({
  ticketNo: z.string().optional().default(""),
  pnr: z.string().optional().default(""),
  route: z.string().optional().default(""),
  journeyDate: z.string().optional(),
  returnDate: z.string().optional(),
  airline: z.string().optional().default(""),
  referenceNo: z.string().optional().default(""),
}).passthrough()

const HotelEntrySchema = z.object({
  hotelName: z.string().optional().default(""),
  referenceNo: z.string().optional().default(""),
  checkInDate: z.string().optional(),
  checkOutDate: z.string().optional(),
  roomType: z.string().optional().default(""),
}).passthrough()

const TransportEntrySchema = z.object({
  transportType: z.string().optional().default(""),
  referenceNo: z.string().optional().default(""),
  pickupPlace: z.string().optional().default(""),
  dropOffPlace: z.string().optional().default(""),
}).passthrough()

// ─── Standard / Visa invoice payload ─────────────────────────────────────────

export const StandardInvoiceSchema = z.object({
  invoiceType: z.enum(["standard", "visa"]).default("standard"),
  general: z.object({
    invoiceNo: z.string().trim().min(1, "Invoice number is required"),
    salesDate: DateString,
    dueDate: z.string().optional().default(""),
    clientId: z.string().trim().min(1, "Client is required"),
    employeeId: z.string().trim().min(1, "Sales person is required"),
    agentId: z.string().optional().default(""),
    salesByName: z.string().optional().default(""),
  }),
  billing: BillingSummarySchema,
  passport: z.array(PassportEntrySchema).optional().default([]),
  ticket: z.array(TicketEntrySchema).optional().default([]),
  hotel: z.array(HotelEntrySchema).optional().default([]),
  transport: z.array(TransportEntrySchema).optional().default([]),
  moneyReceipt: InlineMoneyReceiptSchema.optional(),
  showPrevDue: z.boolean().optional().default(false),
  showDiscount: z.boolean().optional().default(false),
  agentCommission: NonNegative,
  clientPreviousDue: NonNegative,
})

export type StandardInvoicePayload = z.infer<typeof StandardInvoiceSchema>

// ─── Non-commission invoice payload ──────────────────────────────────────────

const PaxEntrySchema = z.object({
  passportId: z.string().optional().default(""),
  name: z.string().optional().default(""),
  paxType: z.string().optional().default(""),
  contactNo: z.string().optional().default(""),
  email: z.string().optional().default(""),
  dob: z.string().optional(),
  dateOfIssue: z.string().optional(),
  dateOfExpire: z.string().optional(),
}).passthrough()

const FlightEntrySchema = z.object({
  flightNo: z.string().optional().default(""),
  airline: z.string().optional().default(""),
  from: z.string().optional().default(""),
  to: z.string().optional().default(""),
  flyDate: z.string().optional(),
  departureTime: z.string().optional().default(""),
  arrivalTime: z.string().optional().default(""),
}).passthrough()

const NonCommTicketDetailsSchema = z.object({
  ticketNo: z.string().trim().min(1, "Ticket number is required"),
  pnr: z.string().optional().default(""),
  gdsPnr: z.string().optional().default(""),
  vendor: z.string().trim().min(1, "Vendor is required"),
  airline: z.string().optional().default(""),
  route: z.string().optional().default(""),
  clientPrice: z.number().min(0, "Client price must be ≥ 0"),
  purchasePrice: z.number().min(0, "Purchase price must be ≥ 0"),
  paxName: z.string().optional().default(""),
  issueDate: z.string().optional(),
  journeyDate: z.string().optional(),
  returnDate: z.string().optional(),
  ticketType: z.string().optional().default(""),
  airbusClass: z.string().optional().default(""),
})

export const NonCommissionInvoiceItemSchema = z.object({
  ticketDetails: NonCommTicketDetailsSchema,
  paxEntries: z.array(PaxEntrySchema).default([]),
  flightEntries: z.array(FlightEntrySchema).default([]),
  profit: z.number().default(0),
})

const NonCommBillingSummarySchema = z.object({
  netTotal: z.number().positive("Net total must be positive"),
  discount: NonNegative,
  serviceCharge: NonNegative,
  vatTax: NonNegative,
  agentCommission: NonNegative,
  showPrevDue: z.string().optional(),
  showDiscount: z.string().optional(),
  note: z.string().optional().default(""),
  reference: z.string().optional().default(""),
})

export const NonCommissionInvoiceSchema = z.object({
  general: z.object({
    invoiceNo: z.string().trim().min(1, "Invoice number is required"),
    salesDate: DateString,
    dueDate: z.string().optional().default(""),
    clientId: z.string().trim().min(1, "Client is required"),
    employeeId: z.string().trim().min(1, "Sales person is required"),
    agentId: z.string().optional().default(""),
  }),
  items: z.array(NonCommissionInvoiceItemSchema).min(1, "At least one ticket is required"),
  billing: NonCommBillingSummarySchema,
})

export type NonCommissionInvoicePayload = z.infer<typeof NonCommissionInvoiceSchema>

// ─── Helper: parse and return typed errors ───────────────────────────────────

export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {}
  for (const issue of error.issues) {
    const path = issue.path.join(".")
    result[path || "_root"] = issue.message
  }
  return result
}
