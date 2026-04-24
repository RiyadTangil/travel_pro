import { type NextRequest, NextResponse } from "next/server"
import {
  listPassports,
  createPassports,
  getPassportById,
  updatePassport,
  deletePassport,
} from "@/services/passportService"
import { apiErrorResponse } from "@/errors/apiErrorResponse"

export async function listPassportsHandler(request: NextRequest) {
  try {
    const companyId = request.headers.get("x-company-id") || ""
    const sp        = request.nextUrl.searchParams
    const result    = await listPassports({
      companyId,
      page:      Number(sp.get("page")  || 1),
      limit:     Number(sp.get("limit") || 20),
      search:    sp.get("search")    || "",
      status:    sp.get("status")    || "",
      clientId:  sp.get("clientId")  || "",
      startDate: sp.get("startDate") || undefined,
      endDate:   sp.get("endDate")   || undefined,
    })
    return NextResponse.json(result)
  } catch (err) {
    return apiErrorResponse(err)
  }
}

export async function createPassportHandler(request: NextRequest) {
  try {
    const companyId = request.headers.get("x-company-id") || ""
    const body      = await request.json()
    const items     = Array.isArray(body) ? body : [body]
    const result    = await createPassports(items, companyId)
    return NextResponse.json({ passports: result }, { status: 201 })
  } catch (err) {
    return apiErrorResponse(err)
  }
}

export async function getPassportByIdHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id }    = await params
    const companyId = request.headers.get("x-company-id") || ""
    const result    = await getPassportById(id, companyId)
    return NextResponse.json({ passport: result })
  } catch (err) {
    return apiErrorResponse(err)
  }
}

export async function updatePassportHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id }    = await params
    const companyId = request.headers.get("x-company-id") || ""
    const updates   = await request.json()
    const result    = await updatePassport(id, updates, companyId)
    return NextResponse.json(result)
  } catch (err) {
    return apiErrorResponse(err)
  }
}

export async function deletePassportHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id }    = await params
    const companyId = request.headers.get("x-company-id") || ""
    const result    = await deletePassport(id, companyId)
    return NextResponse.json(result)
  } catch (err) {
    return apiErrorResponse(err)
  }
}
