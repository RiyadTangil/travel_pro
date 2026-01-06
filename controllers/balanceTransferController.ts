import { ok, fail } from "@/utils/api-response"
import { z } from "zod"
import { listBalanceTransfers, createBalanceTransfer, updateBalanceTransfer, deleteBalanceTransfer } from "@/services/balanceTransferService"

const createSchema = z.object({
  transferFromId: z.string().min(1, "Transfer From is required"),
  transferToId: z.string().min(1, "Transfer To is required"),
  amount: z.coerce.number().min(0.01, "Amount must be positive"),
  transferCharge: z.coerce.number().min(0).optional(),
  date: z.string().min(1, "Date is required"),
  note: z.string().optional(),
}).refine((data) => data.transferFromId !== data.transferToId, {
  message: "Transfer accounts must be different",
  path: ["transferToId"],
})

export async function list(params: any) {
  try {
    const result = await listBalanceTransfers(params)
    return ok(result)
  } catch (error: any) {
    return fail(error.message, error.statusCode || 500)
  }
}

export async function create(body: any, companyId?: string) {
  try {
    const validated = createSchema.parse(body)
    const result = await createBalanceTransfer(validated, companyId)
    return ok(result)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return fail(error.errors[0].message, 400)
    }
    return fail(error.message, error.statusCode || 500)
  }
}

export async function update(id: string, body: any, companyId?: string) {
  try {
    const validated = createSchema.parse(body)
    const result = await updateBalanceTransfer(id, validated, companyId)
    return ok(result)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return fail(error.errors[0].message, 400)
    }
    return fail(error.message, error.statusCode || 500)
  }
}

export async function remove(id: string, companyId?: string) {
  try {
    const result = await deleteBalanceTransfer(id, companyId)
    return ok(result)
  } catch (error: any) {
    return fail(error.message, error.statusCode || 500)
  }
}
