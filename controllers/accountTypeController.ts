import { ok, fail } from "@/utils/api-response"
import { z } from "zod"
import {
  listAccountTypes,
  createAccountType,
  updateAccountType,
  deleteAccountType,
} from "@/services/accountTypeService"
import { isAppError } from "@/errors/AppError"

const nameSchema = z.object({
  name: z.string().min(1, "Name is required"),
})

export async function list(search?: string) {
  try {
    const items = await listAccountTypes({ search: search?.trim() })
    return ok({ items })
  } catch (e: any) {
    const msg = isAppError(e) ? e.message : e?.message || "Failed to list account types"
    return fail(msg, isAppError(e) ? e.status : 500)
  }
}

export async function create(body: unknown) {
  try {
    const parsed = nameSchema.safeParse(body)
    if (!parsed.success) {
      const msg = parsed.error.flatten().fieldErrors.name?.[0] || "Validation failed"
      return fail({ error: "validation_error", message: msg }, 400)
    }
    const result = await createAccountType(parsed.data)
    return ok(result, 201)
  } catch (e: any) {
    const status = isAppError(e) ? e.status : e?.statusCode || 500
    const msg = e?.message || "Failed to create account type"
    return fail(msg, status)
  }
}

export async function update(id: string, body: unknown) {
  try {
    const parsed = nameSchema.safeParse(body)
    if (!parsed.success) {
      const msg = parsed.error.flatten().fieldErrors.name?.[0] || "Validation failed"
      return fail({ error: "validation_error", message: msg }, 400)
    }
    const result = await updateAccountType(id, parsed.data)
    return ok(result)
  } catch (e: any) {
    const status = isAppError(e) ? e.status : e?.statusCode || 500
    const msg = e?.message || "Failed to update account type"
    return fail(msg, status)
  }
}

export async function remove(id: string) {
  try {
    const result = await deleteAccountType(id)
    return ok(result)
  } catch (e: any) {
    const status = isAppError(e) ? e.status : e?.statusCode || 500
    const msg = e?.message || "Failed to delete account type"
    return fail(msg, status)
  }
}
