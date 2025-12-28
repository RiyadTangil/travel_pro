import { NextRequest, NextResponse } from "next/server"
import { createExpense, listExpenses } from "@/services/expenseService"
import { z } from "zod"

const ItemSchema = z.object({
  headId: z.string().min(1, "Head is required"),
  headName: z.string().optional(),
  amount: z.coerce.number().min(0.01, "Amount must be positive")
})

const CreateExpenseSchema = z.object({
  date: z.string().min(1, "Date is required"),
  accountId: z.string().min(1, "Account is required"),
  paymentMethod: z.string().min(1, "Payment method is required"),
  items: z.array(ItemSchema).min(1, "At least one item is required"),
  note: z.string().optional(),
  // voucherImage1: z.string().optional(),
  // voucherImage2: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = request.headers.get('x-company-id') || undefined
    
    const page = Number(searchParams.get("page") || "1")
    const pageSize = Number(searchParams.get("pageSize") || "20")
    const search = searchParams.get("search") || undefined
    const dateFrom = searchParams.get("dateFrom") || undefined
    const dateTo = searchParams.get("dateTo") || undefined

    const result = await listExpenses({ page, pageSize, companyId, search, dateFrom, dateTo })
    return NextResponse.json(result)
  } catch (err: any) {
    const msg = err?.message || "Internal server error"
    const status = err?.statusCode || 500
    return NextResponse.json({ error: msg }, { status })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const companyId = request.headers.get('x-company-id') || undefined

    // Validate with Zod
    const validated = CreateExpenseSchema.parse(body)

    const result = await createExpense(validated, companyId)
    return NextResponse.json(result, { status: 201 })
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message, details: err.errors }, { status: 400 })
    }
    const msg = err?.message || "Internal server error"
    const status = err?.statusCode || 500
    return NextResponse.json({ error: msg }, { status })
  }
}
