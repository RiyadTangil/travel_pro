import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

// GET single agent, PUT update, DELETE remove

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid agent ID" }, { status: 400 })
    }

    const companyId = request.headers.get('x-company-id')
    const client = await clientPromise
    const db = client.db("manage_agency")
    const agents = db.collection("agents")

    const query: any = { _id: new ObjectId(id) }
    if (companyId) query.companyId = companyId

    const doc = await agents.findOne(query)
    if (!doc) return NextResponse.json({ error: "Agent not found or access denied" }, { status: 404 })

    return NextResponse.json({
      agent: {
        id: String(doc._id),
        name: doc.name || "",
        mobile: doc.mobile || doc.phone || "",
        email: doc.email || "",
        commissionRate: Number(doc.commissionRate || 0),
        address: doc.address || "",
        nid: doc.nid || "",
        openingBalanceType: doc.openingBalanceType || "Due",
        dob: doc.dob || "",
        companyId: doc.companyId || companyId || "",
      },
    })
  } catch (error) {
    console.error("Agents [id] GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid agent ID" }, { status: 400 })
    }

    const companyId = request.headers.get('x-company-id')
    const body = await request.json()

    const client = await clientPromise
    const db = client.db("manage_agency")
    const agents = db.collection("agents")

    const query: any = { _id: new ObjectId(id) }
    if (companyId) query.companyId = companyId

    const update: any = {
      $set: {
        name: body.name,
        email: body.email ?? "",
        commissionRate: Number(body.commissionRate || 0),
        mobile: body.mobile || body.phone || "",
        phone: body.mobile || body.phone || "",
        address: body.address ?? "",
        nid: body.nid ?? "",
        openingBalanceType: body.openingBalanceType ?? "Due",
        dob: body.dob ?? "",
        updatedAt: new Date(),
      },
    }

    const result = await agents.updateOne(query, update)
    if (result.matchedCount === 0) return NextResponse.json({ error: "Agent not found or access denied" }, { status: 404 })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Agents [id] PUT error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid agent ID" }, { status: 400 })
    }

    const companyId = request.headers.get('x-company-id')
    const client = await clientPromise
    const db = client.db("manage_agency")
    const agents = db.collection("agents")

    const query: any = { _id: new ObjectId(id) }
    if (companyId) query.companyId = companyId

    const result = await agents.deleteOne(query)
    if (result.deletedCount === 0) return NextResponse.json({ error: "Agent not found or access denied" }, { status: 404 })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Agents [id] DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}