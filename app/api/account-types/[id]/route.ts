import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
    const body = await request.json()
    const name = String(body.name || "").trim()
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 })

    const client = await clientPromise
    const db = client.db("manage_agency")
    const col = db.collection("account_types")

    await col.updateOne({ _id: new ObjectId(id) }, { $set: { name } })
    return NextResponse.json({ id, name })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to update account type" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 })

    const client = await clientPromise
    const db = client.db("manage_agency")
    const col = db.collection("account_types")

    const res = await col.deleteOne({ _id: new ObjectId(id) })
    if (!res.deletedCount) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to delete account type" }, { status: 500 })
  }
}
