import { ok, fail } from "@/utils/api-response"
import { isAppError } from "@/errors/AppError"
import { listClients, createClient, getClientById, updateClientById, deleteClientById } from "@/services/clientsService"
import { z } from "zod"

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  clientType: z.enum(["Individual", "Corporate"], { required_error: "Client Type is required" }),
  categoryId: z.string().min(1, "Category is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  gender: z.string().optional().or(z.literal("")),
  source: z.string().optional().or(z.literal("")),
  designation: z.string().optional().or(z.literal("")),
  tradeLicenseNo: z.string().optional().or(z.literal("")),
  openingBalanceType: z.enum(["", "Due", "Advance"]).optional().or(z.literal("")),
  openingBalanceAmount: z.string().optional().or(z.literal("")),
  creditLimit: z.union([z.string(), z.number()]).optional().or(z.literal("")),
  walkingCustomer: z.enum(["No", "Yes"]).optional(),
})

export async function list(params: { page?: number; limit?: number; search?: string; categoryId?: string; userId?: string; status?: string; companyId?: string }) {
  try {
    const data = await listClients(params)
    return ok({ clients: data.clients, pagination: data.pagination })
  } catch (e: any) {
    if (isAppError(e)) return fail({ error: e.code || "error", message: e.message }, e.status)
    console.error("clientsManagerController.list error:", e)
    return fail("Internal server error", 500)
  }
}

export async function create(body: any) {
  try {
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return fail({ error: "validation_error", message: JSON.stringify(parsed.error.flatten().fieldErrors) }, 400)
    }
    const data = await createClient(parsed.data)
    return ok(data, 201)
  } catch (e: any) {
    if (isAppError(e)) return fail({ error: e.code || "error", message: e.message }, e.status)
    console.error("clientsManagerController.create error:", e)
    return fail("Internal server error", 500)
  }
}

export async function getById(id: string) {
  try {
    const client = await getClientById(id)
    if (!client) return fail({ error: "not_found", message: "Client not found" }, 404)
    return ok(client)
  } catch (e: any) {
    if (isAppError(e)) return fail({ error: e.code || "error", message: e.message }, e.status)
    console.error("clientsManagerController.getById error:", e)
    return fail("Internal server error", 500)
  }
}

const updateSchema = z.object({
  name: z.string().optional(),
  clientType: z.enum(["Individual", "Corporate"]).optional(),
  categoryId: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  gender: z.string().optional(),
  source: z.string().optional(),
  designation: z.string().optional(),
  tradeLicenseNo: z.string().optional(),
  creditLimit: z.union([z.string(), z.number()]).optional(),
  walkingCustomer: z.enum(["No", "Yes"]).optional(),
  active: z.boolean().optional(),
  // Explicitly forbid opening balance edits via validation
  openingBalanceType: z.undefined().optional(),
  openingBalanceAmount: z.undefined().optional(),
})

export async function updateById(id: string, body: any) {
  try {
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return fail({ error: "validation_error", message: JSON.stringify(parsed.error.flatten().fieldErrors) }, 400)
    }
    const updated = await updateClientById(id, parsed.data)
    if (!updated) return fail({ error: "not_found", message: "Client not found" }, 404)
    return ok(updated)
  } catch (e: any) {
    if (isAppError(e)) return fail({ error: e.code || "error", message: e.message }, e.status)
    console.error("clientsManagerController.updateById error:", e)
    return fail("Internal server error", 500)
  }
}

export async function deleteById(id: string) {
  try {
    const deleted = await deleteClientById(id)
    if (!deleted) return fail({ error: "not_found", message: "Client not found" }, 404)
    return ok({ deleted: true })
  } catch (e: any) {
    if (isAppError(e)) return fail({ error: e.code || "error", message: e.message }, e.status)
    console.error("clientsManagerController.deleteById error:", e)
    return fail("Internal server error", 500)
  }
}
