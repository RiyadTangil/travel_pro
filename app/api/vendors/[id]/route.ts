import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid vendor ID" }, { status: 400 })

    const client = await clientPromise
    const db = client.db("manage_agency")
    const collection = db.collection("vendors")

    const doc = await collection.findOne({ _id: new ObjectId(id) })
    if (!doc) return NextResponse.json({ error: "Vendor not found" }, { status: 404 })

    const vendor = {
      id: String(doc._id),
      name: doc.name,
      email: doc.email || "",
      mobilePrefix: doc.mobilePrefix || "",
      mobile: doc.mobile || "",
      registrationDate: doc.registrationDate ? new Date(doc.registrationDate) : undefined,
      openingBalanceType: doc.openingBalanceType || undefined,
      openingBalance: doc.openingBalance || 0,
      fixedAdvance: doc.fixedAdvance || 0,
      address: doc.address || "",
      creditLimit: doc.creditLimit || 0,
      active: !!doc.active,
      products: Array.isArray(doc.products) ? doc.products : [],
      presentBalance: doc.presentBalance || { type: "due", amount: 0 },
      fixedBalance: doc.fixedBalance || 0,
      companyId: doc.companyId || null,
      createdBy: doc.createdBy || undefined,
    }

    return NextResponse.json({ vendor })
  } catch (error) {
    console.error("Vendors GET by id error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid vendor ID" }, { status: 400 })
    const payload = await request.json()
    const update: any = {}

    const fields = [
      "name","email","mobilePrefix","mobile","openingBalanceType","openingBalance","fixedAdvance","address","creditLimit","products","presentBalance","fixedBalance","registrationDate","active"
    ]
    for (const key of fields) {
      if (payload[key] !== undefined) update[key] = payload[key]
    }
    if (update.registrationDate) update.registrationDate = new Date(update.registrationDate)
    update.updatedAt = new Date()

    const client = await clientPromise
    const db = client.db("manage_agency")
    const collection = db.collection("vendors")

    const result = await collection.updateOne({ _id: new ObjectId(id) }, { $set: update })
    if (!result.matchedCount) return NextResponse.json({ error: "Vendor not found" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Vendors PUT error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid vendor ID" }, { status: 400 })

    const client = await clientPromise
    const db = client.db("manage_agency")
    const collection = db.collection("vendors")

    const result = await collection.deleteOne({ _id: new ObjectId(id) })
    if (!result.deletedCount) return NextResponse.json({ error: "Vendor not found" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Vendors DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Toggle status
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid vendor ID" }, { status: 400 })
    const body = await request.json()
    const active = !!body?.active

    const client = await clientPromise
    const db = client.db("manage_agency")
    const collection = db.collection("vendors")

    const result = await collection.updateOne({ _id: new ObjectId(id) }, { $set: { active, updatedAt: new Date() } })
    if (!result.matchedCount) return NextResponse.json({ error: "Vendor not found" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Vendors PATCH error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}