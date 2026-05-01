import { NextResponse } from "next/server"
import { getVendors, createVendor } from "@/services/vendorService"
import { ok, fail, badRequest } from "@/utils/api-response"
import { AppError } from "@/errors/AppError"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number(searchParams.get("page") || 1)
    const pageSize = Number(searchParams.get("pageSize") || 20)
    const search = (searchParams.get("search") || "").trim()
    const companyId = request.headers.get("x-company-id")

    if (!companyId) {
      return badRequest("Company ID is required")
    }

    const result = await getVendors({ page, pageSize, search, companyId })
    return ok(result.data, 200, "Vendors fetched successfully", { 
      page: result.page, 
      limit: result.pageSize, 
      total: result.total 
    })
  } catch (error) {
    console.error("Vendors GET error:", error)
    if (error instanceof AppError) {
      return fail(error.message, error.statusCode)
    }
    return fail("Internal server error", 500)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const companyId = request.headers.get("x-company-id")

    if (!companyId) {
      return badRequest("Company ID is required")
    }

    const result = await createVendor({ ...body, companyId })
    return ok(result, 201, "Vendor created successfully")
  } catch (error) {
    console.error("Vendors POST error:", error)
    if (error instanceof AppError) {
      return fail(error.message, error.statusCode)
    }
    return fail("Internal server error", 500)
  }
}
