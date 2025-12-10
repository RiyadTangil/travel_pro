import { ok, fail } from "@/utils/api-response"
import { getInvoiceById, updateInvoiceById, deleteInvoiceById } from "@/services/invoiceService"
import { isAppError } from "@/errors/AppError"
import { z } from "zod"

export async function getById(params: { id: string; companyId?: string }) {
  try {
    const { id, companyId } = params
    const data = await getInvoiceById(id, companyId)
    return ok(data)
  } catch (e: any) {
    if (isAppError(e)) return fail({ error: e.code || "error", message: e.message }, e.status)
    console.error("invoiceController.getById error:", e)
    return fail("Internal server error", 500)
  }
}

export async function updateById(id: string, body: any, companyId?: string) {
  try {
    // Zod validation for update payload (all fields optional, UI-aligned keys)
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
      passportNo: z.string().optional().default(""),
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
      quantity: z.number().optional(),
      unitPrice: z.number().optional(),
      costPrice: z.number().optional(),
      totalSales: z.number().optional(),
      totalCost: z.number().optional(),
      profit: z.number().optional(),
      vendor: z.string().optional().default(""),
    })
    const billingSchema = z.object({
      items: z.array(billingItemSchema).optional().default([]),
      subtotal: z.number().optional(),
      discount: z.number().optional(),
      serviceCharge: z.number().optional(),
      vatTax: z.number().optional(),
      netTotal: z.number().optional(),
      note: z.string().optional().default(""),
      reference: z.string().optional().default(""),
    })
    const generalSchema = z.object({
      client: z.string().optional(),
      salesBy: z.string().optional(),
      invoiceNo: z.string().optional(),
      salesDate: z.string().optional(),
      dueDate: z.string().optional().default(""),
      agent: z.string().optional().default(""),
      salesByName: z.string().optional(),
    })
    const updateSchema = z.object({
      general: generalSchema.optional(),
      billing: billingSchema.optional(),
      // UI-aligned singular keys
      passport: z.array(passportSchema).optional(),
      ticket: z.array(ticketSchema).optional(),
      hotel: z.array(hotelSchema).optional(),
      transport: z.array(transportSchema).optional(),
      // Accept legacy synonyms without validating content (they will be ignored if singular keys are present)
      passports: z.any().optional(),
      tickets: z.any().optional(),
      hotels: z.any().optional(),
      transports: z.any().optional(),
    })
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      const issues = parsed.error.issues.map(i => ({ path: i.path.join("."), message: i.message }))
      return fail({ error: "validation_error", message: "Invalid invoice data" }, 400)
    }
    const result = await updateInvoiceById(id, parsed.data, companyId)
    return ok(result)
  } catch (e: any) {
    if (isAppError(e)) return fail({ error: e.code || "error", message: e.message }, e.status)
    console.error("invoiceController.updateById error:", e)
    return fail("Internal server error", 500)
  }
}

export async function deleteById(id: string, companyId?: string) {
  try {
    const result = await deleteInvoiceById(id, companyId)
    return ok(result)
  } catch (e: any) {
    if (isAppError(e)) return fail({ error: e.code || "error", message: e.message }, e.status)
    console.error("invoiceController.deleteById error:", e)
    return fail("Internal server error", 500)
  }
}
