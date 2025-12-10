import { ok, fail } from "@/utils/api-response"
import { z } from "zod"
import { createClientCategory, listClientCategories, updateClientCategory } from "@/services/clientCategoryService"

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  prefix: z.string().min(1, "Prefix is required"),
  status: z.enum(["active", "inactive"]).optional(),
  companyId: z.string().optional().or(z.literal("")).or(z.null()),
})

const updateSchema = z.object({
  name: z.string().optional(),
  prefix: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
})

export async function list(query: { page?: number; pageSize?: number; companyId?: string }) {
  try {
    const { data, total } = await listClientCategories(query)
    return ok({ data, total })
  } catch (error) {
    console.error("clientCategoryController.list error:", error)
    return fail("Internal server error", 500)
  }
}

export async function create(body: any) {
  try {
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return fail({ error: "validation_error", message: JSON.stringify(parsed.error.flatten().fieldErrors) }, 400)
    const created = await createClientCategory(parsed.data)
    return ok({ data: created }, 201)
  } catch (error) {
    console.error("clientCategoryController.create error:", error)
    return fail("Internal server error", 500)
  }
}

export async function update(id: string, body: any) {
  try {
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return fail({ error: "validation_error", message: JSON.stringify(parsed.error.flatten().fieldErrors) }, 400)
    const updated = await updateClientCategory(id, parsed.data)
    if (!updated) return fail({ error: "not_found", message: "Category not found" }, 404)
    return ok({ data: updated })
  } catch (error) {
    console.error("clientCategoryController.update error:", error)
    return fail("Internal server error", 500)
  }
}

