import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

// Products API
// Collection: products

type ProductDoc = {
  _id: any
  name: string
  nameLower: string
  status: "active" | "inactive"
  categoryId: string
  categoryTitle: string
  companyId: string | null
  deleted?: boolean
  createdAt: Date
  updatedAt: Date
}

function toResponse(d: ProductDoc) {
  return {
    id: String(d._id),
    product_name: d.name,
    product_status: d.status === "active" ? 1 : 0,
    product_category_id: d.categoryId,
    category_title: d.categoryTitle,
    company_id: d.companyId,
    products_is_deleted: d.deleted ? 1 : 0,
    createdAt: d.createdAt,
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number(searchParams.get("page") || 1)
    const pageSize = Number(searchParams.get("pageSize") || 10)
    const skip = (page - 1) * pageSize
    const q = (searchParams.get("q") || "").trim().toLowerCase()

    const client = await clientPromise
    const db = client.db("manage_agency")
    const collection = db.collection<ProductDoc>("products")

    const query: any = { deleted: { $ne: true } }
    if (q) query.nameLower = { $regex: q, $options: "i" }

    const total = await collection.countDocuments(query)
    const docs = await collection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .toArray()

    const data = docs.map((d) => toResponse(d))
    return NextResponse.json({ data, total, page, pageSize })
  } catch (error) {
    console.error("Products GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const name = String(body?.name || "").trim()
    const categoryId = String(body?.categoryId || "").trim()
    const companyId = body?.companyId || null
    if (!name || !categoryId) {
      return NextResponse.json({ error: "Name and category are required" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("manage_agency")
    const collection = db.collection<ProductDoc>("products")

    // Prevent duplicate name per company (case-insensitive, non-deleted)
    const existing = await collection.findOne({ nameLower: name.toLowerCase(), deleted: { $ne: true } })
    if (existing) {
      return NextResponse.json({ error: "Duplicate product name" }, { status: 409 })
    }

    // Fetch category title
    const cat = await db.collection("categories").findOne({ _id: new ObjectId(categoryId) })
    const categoryTitle = cat?.name || ""

    const doc: ProductDoc = {
      _id: undefined as any, // set by insertOne
      name,
      nameLower: name.toLowerCase(),
      status: "active",
      categoryId,
      categoryTitle,
      companyId,
      deleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await collection.insertOne(doc as any)
    const inserted = await collection.findOne({ _id: result.insertedId })
    return NextResponse.json({ data: inserted ? toResponse(inserted) : null })
  } catch (error) {
    console.error("Products POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}