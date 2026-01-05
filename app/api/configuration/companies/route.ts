import { NextRequest, NextResponse } from "next/server"
import { Types } from "mongoose"
import connectMongoose from "@/lib/mongoose"
import { NonInvoiceCompany } from "@/models/non-invoice-company"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    const { searchParams } = new URL(request.url)
    const companyId = request.headers.get("x-company-id")
    const page = Number(searchParams.get("page") || 1)
    const pageSize = Number(searchParams.get("pageSize") || 20)
    const search = searchParams.get("search") || ""

    if (!companyId) return NextResponse.json({ error: "Company ID required" }, { status: 400 })

    const filter: any = { companyId: new Types.ObjectId(companyId) }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { contactPerson: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } }
      ]
    }

    const total = await NonInvoiceCompany.countDocuments(filter)
    const items = await NonInvoiceCompany.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean()

    const mappedItems = items.map((i: any) => ({
      id: i._id,
      name: i.name,
      contactPerson: i.contactPerson,
      designation: i.designation,
      phone: i.phone,
      address: i.address,
      createDate: i.createdAt
    }))

    return NextResponse.json({
      items: mappedItems,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    const body = await request.json()
    const companyId = request.headers.get("x-company-id")

    if (!companyId) return NextResponse.json({ error: "Company ID required" }, { status: 400 })
    if (!body.name) return NextResponse.json({ error: "Company Name is required" }, { status: 400 })

    const newCompany = await NonInvoiceCompany.create({
      ...body,
      companyId: new Types.ObjectId(companyId),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    return NextResponse.json(newCompany)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
