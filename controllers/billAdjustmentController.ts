import { ok, fail } from "@/utils/api-response"
import { createBillAdjustment, getBillAdjustments } from "@/services/billAdjustmentService"

export async function postBillAdjustment(body: any, companyId: string) {
  try {
    const result = await createBillAdjustment(body, companyId)
    return ok(result)
  } catch (error: any) {
    console.error("billAdjustmentController.post error:", error)
    return fail({ error: error.message || "Internal server error" }, 500)
  }
}

export async function listBillAdjustments(companyId: string, page: number, pageSize: number) {
  try {
    const result = await getBillAdjustments(companyId, page, pageSize)
    return ok(result)
  } catch (error: any) {
    console.error("billAdjustmentController.list error:", error)
    return fail({ error: error.message || "Internal server error" }, 500)
  }
}
