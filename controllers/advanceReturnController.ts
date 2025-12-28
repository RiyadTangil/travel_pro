import { ok, fail } from "@/utils/api-response"
import { z } from "zod"
import { createAdvanceReturn, listAdvanceReturns, updateAdvanceReturn, deleteAdvanceReturn } from "@/services/advanceReturnService"

const createSchema = z.object({
  clientId: z.string().min(1),
  paymentMethod: z.string().min(1),
  accountId: z.string().min(1),
  advanceAmount: z.coerce.number().min(0.01),
  returnDate: z.string().min(1),
  accountName: z.string().optional(),
  returnNote: z.string().optional(),
  receiptNo: z.string().optional(),
  transactionCharge: z.coerce.number().optional(),
})

const updateSchema = z.object({
  paymentMethod: z.string().optional(),
  accountName: z.string().optional(),
  advanceAmount: z.coerce.number().optional(),
  returnDate: z.string().optional(),
  returnNote: z.string().optional(),
  receiptNo: z.string().optional(),
  transactionCharge: z.coerce.number().optional(),
})

export async function list(query: { page?: number; pageSize?: number; search?: string; dateFrom?: string; dateTo?: string; clientId?: string; companyId?: string }) {
  try {
    const result = await listAdvanceReturns(query)
    return ok(result)
  } catch (error) {
    return fail("Internal server error", 500)
  }
}

export async function create(body: any, companyId?: string) {
  try {
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return fail({ error: "validation_error", message: JSON.stringify(parsed.error.flatten().fieldErrors) }, 400)
    const result = await createAdvanceReturn(parsed.data, companyId)
    return ok(result, 201)
  } catch (error: any) {
    const msg = error?.message || "Internal server error"
    const status = error?.statusCode || 500
    return fail(msg, status)
  }
}

export async function update(id: string, body: any, companyId?: string) {
  try {
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return fail({ error: "validation_error", message: JSON.stringify(parsed.error.flatten().fieldErrors) }, 400)
    const result = await updateAdvanceReturn(id, parsed.data, companyId)
    return ok(result)
  } catch (error: any) {
    const msg = error?.message || "Internal server error"
    const status = error?.statusCode || 500
    return fail(msg, status)
  }
}

export async function remove(id: string, companyId?: string) {
  try {
    const result = await deleteAdvanceReturn(id, companyId)
    return ok(result)
  } catch (error: any) {
    const msg = error?.message || "Internal server error"
    const status = error?.statusCode || 500
    return fail(msg, status)
  }
}
