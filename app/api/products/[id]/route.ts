import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 })
    }

    const body = await request.json()
    const update: any = {}
    if (typeof body.name === "string") {
      update.name = body.name.trim()
      update.nameLower = update.name.toLowerCase()
    }
    if (typeof body.categoryId === "string") {
      update.categoryId = body.categoryId.trim()
    }
    if (typeof body.status === "string") {
      update.status = body.status === "inactive" ? "inactive" : "active"
    }
    update.updatedAt = new Date()

    const client = await clientPromise
    const db = client.db("manage_agency")
    const collection = db.collection("products")

    // Duplicate guard (per company)
    if (update.nameLower) {
      const existing = await collection.findOne({ nameLower: update.nameLower, deleted: { $ne: true } })
      if (existing && String(existing._id) !== id) {
        return NextResponse.json({ error: "Duplicate product name" }, { status: 409 })
      }
    }

    if (update.categoryId) {
      const cat = await db.collection("categories").findOne({ _id: new ObjectId(update.categoryId) })
      update.categoryTitle = cat?.name || ""
    }

    const result = await collection.updateOne({ _id: new ObjectId(id) }, { $set: update })
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const updated = await collection.findOne({ _id: new ObjectId(id) })
    return NextResponse.json({ data: updated ? {
      id: String(updated._id),
      product_name: updated.name,
      product_status: updated.status === "active" ? 1 : 0,
      product_category_id: updated.categoryId,
      category_title: updated.categoryTitle,
      company_id: updated.companyId || null,
      products_is_deleted: updated.deleted ? 1 : 0,
      createdAt: updated.createdAt,
    } : null })
  } catch (error) {
    console.error("Product PUT error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("manage_agency")
    const collection = db.collection("products")

    const result = await collection.updateOne({ _id: new ObjectId(id) }, { $set: { deleted: true, updatedAt: new Date() } })
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Product DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}