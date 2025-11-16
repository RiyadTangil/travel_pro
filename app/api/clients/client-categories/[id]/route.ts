import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

// Update a single client category
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid category ID" }, { status: 400 })
    }

    const payload = await request.json()
    const update: any = {}
    if (typeof payload.name === "string") update.name = payload.name.trim()
    if (typeof payload.prefix === "string") update.prefix = payload.prefix.trim()
    if (typeof payload.status === "string") update.status = payload.status === "inactive" ? "inactive" : "active"
    update.updatedAt = new Date()

    if (!update.name && !update.prefix) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("manage_agency")
    const collection = db.collection("client_categories")

    const result = await collection.updateOne({ _id: new ObjectId(id) }, { $set: update })
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    const updated = await collection.findOne({ _id: new ObjectId(id) })
    const data = updated ? { id: String(updated._id), name: updated.name, prefix: updated.prefix || "", status: updated.status || "active", companyId: updated.companyId || null } : null
    return NextResponse.json({ data })
  } catch (error) {
    console.error("Client category PUT error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}