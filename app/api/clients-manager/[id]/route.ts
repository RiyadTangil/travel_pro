import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { z } from "zod"

const COLLECTION = "clients_manager"

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  clientType: z.enum(["Individual", "Corporate"]).optional(),
  categoryId: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  gender: z.string().optional().or(z.literal("")),
  source: z.string().optional().or(z.literal("")),
  designation: z.string().optional().or(z.literal("")),
  tradeLicenseNo: z.string().optional().or(z.literal("")),
  openingBalanceType: z.string().optional().or(z.literal("")),
  creditLimit: z.string().optional().or(z.literal("")),
  active: z.boolean().optional(),
})

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 })

    const client = await clientPromise
    const db = client.db("manage_agency")
    const col = db.collection(COLLECTION)
    const doc = await col.findOne({ _id: new ObjectId(id), isDeleted: { $ne: true } })
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ client: { ...doc, id: String(doc._id) } })
  } catch (error) {
    console.error("Clients Manager [id] GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("manage_agency")
    const col = db.collection(COLLECTION)
    const updates = { ...parsed.data, updatedAt: new Date().toISOString() }
    const result = await col.updateOne({ _id: new ObjectId(id) }, { $set: updates })
    if (result.matchedCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Clients Manager [id] PUT error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
    const client = await clientPromise
    const db = client.db("manage_agency")
    const col = db.collection(COLLECTION)
    const result = await col.deleteOne({ _id: new ObjectId(id) })
    if (result.deletedCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Clients Manager [id] DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}