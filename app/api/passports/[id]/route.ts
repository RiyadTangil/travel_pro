import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

const COLLECTION = "passports"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const companyId = request.headers.get('x-company-id')
    const { id } = params
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
    const client = await clientPromise
    const db = client.db("manage_agency")
    const col = db.collection(COLLECTION)
    const query: any = { _id: new ObjectId(id) }
    if (companyId) query.companyId = companyId
    const doc = await col.findOne(query)
    if (!doc) return NextResponse.json({ error: "Not found or access denied" }, { status: 404 })
    return NextResponse.json({ passport: { ...doc, id: String(doc._id) } })
  } catch (error) {
    console.error("Passports [id] GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const companyId = request.headers.get('x-company-id')
    const { id } = params
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
    const updates = await request.json()
    // do not allow changing companyId
    delete (updates as any).companyId
    updates.updatedAt = new Date()
    const client = await clientPromise
    const db = client.db("manage_agency")
    const col = db.collection(COLLECTION)
    const query: any = { _id: new ObjectId(id) }
    if (companyId) query.companyId = companyId
    const found = await col.findOne(query)
    if (!found) return NextResponse.json({ error: "Not found or access denied" }, { status: 404 })
    const result = await col.updateOne(query, { $set: updates })
    if (result.matchedCount === 0) return NextResponse.json({ error: "Not found or access denied" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Passports [id] PUT error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const companyId = request.headers.get('x-company-id')
    const { id } = params
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
    const client = await clientPromise
    const db = client.db("manage_agency")
    const col = db.collection(COLLECTION)
    const query: any = { _id: new ObjectId(id) }
    if (companyId) query.companyId = companyId
    const result = await col.deleteOne(query)
    if (result.deletedCount === 0) return NextResponse.json({ error: "Not found or access denied" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Passports [id] DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}