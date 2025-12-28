import { ok, fail } from "@/utils/api-response"
import { z } from "zod"
import { listExpenseHeads, createExpenseHead, updateExpenseHead, deleteExpenseHead } from "@/services/expenseHeadService"
import { Types } from "mongoose"

const createSchema = z.object({
  name: z.string().min(1),
})

const updateSchema = z.object({
  name: z.string().min(1),
})

const objectIdSchema = z.string().min(1).refine((v) => Types.ObjectId.isValid(String(v)), { message: "Invalid company id" })

export async function list(query: { page?: number; pageSize?: number; search?: string; companyId?: string }) {
  try {
    const parsedCompany = objectIdSchema.safeParse(query.companyId)
    if (!parsedCompany.success) return fail({ error: "validation_error", message: "Company id is required" }, 400)
    const result = await listExpenseHeads(query)
    return ok(result)
  } catch (error) {
    return fail("Internal server error", 500)
  }
}

export async function create(body: any, companyId?: string) {
  try {
    const parsedCompany = objectIdSchema.safeParse(companyId)
    if (!parsedCompany.success) return fail({ error: "validation_error", message: "Company id is required" }, 400)
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return fail({ error: "validation_error", message: JSON.stringify(parsed.error.flatten().fieldErrors) }, 400)
    const result = await createExpenseHead(parsed.data, String(companyId))
    return ok(result, 201)
  } catch (error: any) {
    const msg = error?.message || "Internal server error"
    const status = error?.statusCode || 500
    return fail(msg, status)
  }
}

export async function update(id: string, body: any, companyId?: string) {
  try {
    const parsedCompany = objectIdSchema.safeParse(companyId)
    if (!parsedCompany.success) return fail({ error: "validation_error", message: "Company id is required" }, 400)
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return fail({ error: "validation_error", message: JSON.stringify(parsed.error.flatten().fieldErrors) }, 400)
    const result = await updateExpenseHead(id, parsed.data, String(companyId))
    return ok(result)
  } catch (error: any) {
    const msg = error?.message || "Internal server error"
    const status = error?.statusCode || 500
    return fail(msg, status)
  }
}

export async function remove(id: string, companyId?: string) {
  try {
    const parsedCompany = objectIdSchema.safeParse(companyId)
    if (!parsedCompany.success) return fail({ error: "validation_error", message: "Company id is required" }, 400)
    const result = await deleteExpenseHead(id, String(companyId))
    return ok(result)
  } catch (error: any) {
    const msg = error?.message || "Internal server error"
    const status = error?.statusCode || 500
    return fail(msg, status)
  }
}
