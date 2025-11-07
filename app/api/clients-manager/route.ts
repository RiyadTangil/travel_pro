import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { z } from "zod"

// Collection name: using underscore to avoid hyphen issues in Mongo
const COLLECTION = "clients_manager"

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
  openingBalanceType: z.string().optional().or(z.literal("")),
  creditLimit: z.string().optional().or(z.literal("")),
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number(searchParams.get("page") || 1)
    const limit = Number(searchParams.get("limit") || 10)
    const search = (searchParams.get("search") || "").trim()
    const categoryId = searchParams.get("categoryId") || undefined
    const userId = searchParams.get("userId") || undefined
    const status = searchParams.get("status") || undefined // "active" | "inactive" | undefined

    const client = await clientPromise
    const db = client.db("manage_agency")
    const col = db.collection(COLLECTION)

    const filter: any = { isDeleted: { $ne: true } }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ]
    }
    if (categoryId) filter.categoryId = categoryId
    if (userId) filter["createdBy.id"] = userId
    if (status === "active") filter.active = true
    if (status === "inactive") filter.active = false

    const total = await col.countDocuments(filter)
    const docs = await col
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray()

    return NextResponse.json({
      clients: docs.map(d => ({ ...d, id: String(d._id) })),
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    })
  } catch (error) {
    console.error("Clients Manager GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("manage_agency")
    const col = db.collection(COLLECTION)

    // Generate unique incremental ID based on last inserted
    const last = await col.find({}).sort({ uniqueId: -1 }).limit(1).toArray()
    const nextUniqueId = last.length > 0 && typeof last[0].uniqueId === "number" ? last[0].uniqueId + 1 : 1

    const now = new Date().toISOString()
    const doc = {
      uniqueId: nextUniqueId,
      name: parsed.data.name,
      clientType: parsed.data.clientType,
      categoryId: parsed.data.categoryId,
      email: parsed.data.email || "",
      phone: parsed.data.phone || "",
      address: parsed.data.address || "",
      gender: parsed.data.gender || "",
      source: parsed.data.source || "",
      designation: parsed.data.designation || "",
      tradeLicenseNo: parsed.data.tradeLicenseNo || "",
      openingBalanceType: parsed.data.openingBalanceType || "",
      creditLimit: parsed.data.creditLimit || "",
      presentBalance: 0,
      active: true,
      createdAt: now,
      updatedAt: now,
    }

    const result = await col.insertOne(doc)
    return NextResponse.json({ client: { ...doc, id: String(result.insertedId) } }, { status: 201 })
  } catch (error) {
    console.error("Clients Manager POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}