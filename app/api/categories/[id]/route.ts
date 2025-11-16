import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

// Update or delete a single category
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid category ID" }, { status: 400 })
    }

    const payload = await request.json()
    const update: any = {}
    if (typeof payload.name === "string") update.name = payload.name.trim()
    update.updatedAt = new Date()

    if (!update.name) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("manage_agency")
    const collection = db.collection("categories")

    const result = await collection.updateOne({ _id: new ObjectId(id) }, { $set: update })
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    const updated = await collection.findOne({ _id: new ObjectId(id) })
    const data = updated ? { id: String(updated._id), name: updated.name, companyId: updated.companyId || null } : null
    return NextResponse.json({ data })
  } catch (error) {
    console.error("Category PUT error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid category ID" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("manage_agency")
    const collection = db.collection("categories")

    const result = await collection.deleteOne({ _id: new ObjectId(id) })
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Category DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}