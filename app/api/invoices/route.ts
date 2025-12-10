import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import connectMongoose from "@/lib/mongoose"
import { list, create } from "@/controllers/invoicesController"

// GET /api/invoices - list
export async function GET(request: Request) {
  try {
    await connectMongoose()
    const { searchParams } = new URL(request.url)
    const page = Number(searchParams.get("page") || 1)
    const pageSize = Number(searchParams.get("pageSize") || 20)
    const search = (searchParams.get("search") || "").trim()
    const status = (searchParams.get("status") || "").trim()
    const dateFrom = searchParams.get("dateFrom") || undefined
    const dateTo = searchParams.get("dateTo") || undefined
    const clientId = (searchParams.get("clientId") || "").trim() || undefined
    return await list({ page, pageSize, search, status, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, clientId })
  } catch (error) {
    console.error("Invoices GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}



// POST /api/invoices - create
export async function POST(request: Request) {
  try {
    await connectMongoose()
    const session = await getServerSession(authOptions as any)
    const companyId = (session as any)?.user?.companyId || undefined
    const body = await request.json()
    return await create(body, companyId)
  } catch (error) {
    console.error("Invoices POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

