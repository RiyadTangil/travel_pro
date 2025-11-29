import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
    const payload = await request.json()
    const update: any = {}
    if (payload.name !== undefined) update.name = String(payload.name).trim()
    if (payload.active !== undefined) update.active = !!payload.active
    update.updatedAt = new Date()

    const client = await clientPromise
    const db = client.db("manage_agency")
    const collection = db.collection("transport_types")
    const res = await collection.updateOne({ _id: new ObjectId(id) }, { $set: update })
    if (!res.matchedCount) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("TransportTypes PUT error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
    const client = await clientPromise
    const db = client.db("manage_agency")
    const collection = db.collection("transport_types")
    const res = await collection.deleteOne({ _id: new ObjectId(id) })
    if (!res.deletedCount) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("TransportTypes DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
    const body = await request.json()
    const client = await clientPromise
    const db = client.db("manage_agency")
    const collection = db.collection("transport_types")
    const res = await collection.updateOne({ _id: new ObjectId(id) }, { $set: { active: !!body.active, updatedAt: new Date() } })
    if (!res.matchedCount) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("TransportTypes PATCH error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

