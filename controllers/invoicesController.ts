import { ok, fail } from "@/utils/api-response"
import { isAppError } from "@/errors/AppError"
import { listInvoices, createInvoice } from "@/services/invoiceService"
import { z } from "zod"

// Zod validation schema for invoice creation aligning with frontend fields
const ticketSchema = z.object({
  ticketNo: z.string().optional().default(""),
  pnr: z.string().optional().default(""),
  route: z.string().optional().default(""),
  referenceNo: z.string().optional().default(""),
  journeyDate: z.string().optional().default(""),
  returnDate: z.string().optional().default(""),
  airline: z.string().optional().default(""),
})

const hotelSchema = z.object({
  hotelName: z.string().optional().default(""),
  referenceNo: z.string().optional().default(""),
  checkInDate: z.string().optional().default(""),
  checkOutDate: z.string().optional().default(""),
  roomType: z.string().optional().default(""),
})

const transportSchema = z.object({
  transportType: z.string().optional().default(""),
  referenceNo: z.string().optional().default(""),
  pickupPlace: z.string().optional().default(""),
  pickupTime: z.string().optional().default(""),
  dropOffPlace: z.string().optional().default(""),
  dropoffTime: z.string().optional().default(""),
})

const passportSchema = z.object({
  passportId: z.string().optional(),
  name: z.string().optional().default(""),
  passportNo: z.string().min(1, "Passport No is required"),
  paxType: z.string().optional().default(""),
  contactNo: z.string().optional().default(""),
  email: z.string().optional().default(""),
  dateOfBirth: z.string().optional().default(""),
  dateOfIssue: z.string().optional().default(""),
  dateOfExpire: z.string().optional().default(""),
})

const billingItemSchema = z.object({
  product: z.string().optional().default(""),
  paxName: z.string().optional().default(""),
  description: z.string().optional().default(""),
  quantity: z.number({ invalid_type_error: "Quantity must be a number" }).int().min(1, "Quantity must be at least 1"),
  unitPrice: z.number({ invalid_type_error: "Unit Price must be a number" }).min(0, "Unit Price cannot be negative"),
  costPrice: z.number({ invalid_type_error: "Cost Price must be a number" }).min(0).optional().default(0),
  totalSales: z.number().optional().default(0),
  totalCost: z.number().optional().default(0),
  profit: z.number().optional().default(0),
  vendor: z.string().optional().default(""),
}).superRefine((val, ctx) => {
  if (val.product.trim() && !val.vendor.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Vendor is required when product is provided", path: ["vendor"] })
  }
})

const billingSchema = z.object({
  items: z.array(billingItemSchema),
  subtotal: z.number(),
  discount: z.number(),
  serviceCharge: z.number(),
  vatTax: z.number(),
  netTotal: z.number(),
  note: z.string().optional().default(""),
  reference: z.string().optional().default(""),
})

const generalSchema = z.object({
  client: z.string().min(1, "Client is required"),
  salesBy: z.string().min(1, "Sales By is required"),
  invoiceNo: z.string().min(1, "Invoice No is required"),
  salesDate: z.string().min(1, "Sales Date is required"),
  dueDate: z.string().optional().default(""),
  agent: z.string().optional().default(""),
  salesByName: z.string().optional(),
})

const createSchema = z.object({
  general: generalSchema,
  billing: billingSchema,
  passport: z.array(passportSchema).optional().default([]),
  ticket: z.array(ticketSchema).optional().default([]),
  hotel: z.array(hotelSchema).optional().default([]),
  transport: z.array(transportSchema).optional().default([]),
})

export async function list(params: { page?: number; pageSize?: number; search?: string; status?: string; dateFrom?: string; dateTo?: string; clientId?: string }) {
  try {
    const data = await listInvoices(params)
    return ok(data)
  } catch (e: any) {
    if (isAppError(e)) return fail({ error: e.code || "error", message: e.message }, e.status)
    console.error("invoicesController.list error:", e)
    return fail("Internal server error", 500)
  }
}

export async function create(body: any, companyId?: string) {
  try {
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      const issues = parsed.error.issues.map(i => ({ path: i.path.join("."), message: i.message }))
      return fail({ error: "validation_error", message: "Invalid invoice data" }, 400)
    }
    const data = await createInvoice(parsed.data, companyId)
    return ok(data, 201)
  } catch (e: any) {
    if (isAppError(e)) return fail({ error: e.code || "error", message: e.message }, e.status)
    console.error("invoicesController.create error:", e)
    return fail("Internal server error", 500)
  }
}
