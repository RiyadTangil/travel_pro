import { NextRequest, NextResponse } from "next/server"
import { updateExpense, deleteExpense } from "@/services/expenseService"
import { z } from "zod"

const ItemSchema = z.object({
  headId: z.string().min(1, "Head is required"),
  headName: z.string().optional(),
  amount: z.coerce.number().min(0.01, "Amount must be positive")
})

const UpdateExpenseSchema = z.object({
  date: z.string().min(1, "Date is required"),
  accountId: z.string().min(1, "Account is required"),
  paymentMethod: z.string().min(1, "Payment method is required"),
  items: z.array(ItemSchema).min(1, "At least one item is required"),
  note: z.string().optional(),
})

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const companyId = request.headers.get('x-company-id') || undefined

    // Validate with Zod
    const validated = UpdateExpenseSchema.parse(body)

    const result = await updateExpense(params.id, validated, companyId)
    return NextResponse.json(result)
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message, details: err.errors }, { status: 400 })
    }
    const msg = err?.message || "Internal server error"
    const status = err?.statusCode || 500
    return NextResponse.json({ error: msg }, { status })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const companyId = request.headers.get('x-company-id') || undefined
    const result = await deleteExpense(params.id, companyId)
    return NextResponse.json(result)
  } catch (err: any) {
    const msg = err?.message || "Internal server error"
    const status = err?.statusCode || 500
    return NextResponse.json({ error: msg }, { status })
  }
}
