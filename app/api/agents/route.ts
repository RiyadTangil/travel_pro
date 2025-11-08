import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

// Collection: agents
// Supports GET (list with search/pagination) and POST (create)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const search = (searchParams.get("search") || "").trim()

    // Company isolation via middleware-provided header
    const companyId = request.headers.get('x-company-id')

    const client = await clientPromise
    const db = client.db("manage_agency")
    const agents = db.collection("agents")

    const filter: any = {}
    if (companyId) filter.companyId = companyId

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ]
    }

    const total = await agents.countDocuments(filter)
    const data = await agents
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray()

    const mapped = data.map((d: any) => ({
      id: String(d._id),
      name: d.name || "",
      mobile: d.mobile || d.phone || "",
      email: d.email || "",
      commissionRate: Number(d.commissionRate || 0),
      address: d.address || "",
      nid: d.nid || "",
      openingBalanceType: d.openingBalanceType || "Due",
      dob: d.dob || "",
      companyId: d.companyId || companyId || "",
    }))

    return NextResponse.json({
      data: mapped,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    })
  } catch (error) {
    console.error("Agents GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const companyId = request.headers.get('x-company-id')

    if (!companyId) {
      return NextResponse.json({ error: "Missing company context" }, { status: 400 })
    }

    const {
      name,
      email = "",
      commissionRate = 0,
      mobile = "",
      phone = "",
      address = "",
      nid = "",
      openingBalanceType = "Due",
      dob = "",
    } = body

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("manage_agency")
    const agents = db.collection("agents")

    const doc = {
      name,
      email,
      commissionRate: Number(commissionRate) || 0,
      mobile: mobile || phone || "",
      phone: mobile || phone || "",
      address,
      nid,
      openingBalanceType,
      dob,
      companyId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await agents.insertOne(doc as any)

    return NextResponse.json({ id: String(result.insertedId) })
  } catch (error) {
    console.error("Agents POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}