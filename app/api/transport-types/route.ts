import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

type TransportTypePayload = {
  name: string
  active?: boolean
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number(searchParams.get("page") || 1)
    const pageSize = Number(searchParams.get("pageSize") || 20)
    const search = (searchParams.get("search") || "").trim()
    const skip = (page - 1) * pageSize

    const client = await clientPromise
    const db = client.db("manage_agency")
    const collection = db.collection("transport_types")

    const query: any = {}
    if (search) query.name = { $regex: search, $options: "i" }

    const total = await collection.countDocuments(query)
    const docs = await collection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .toArray()

    const items = docs.map((d: any) => ({ id: String(d._id), name: d.name, active: d.active !== false }))
    return NextResponse.json({ items, total, page, pageSize })
  } catch (error) {
    console.error("TransportTypes GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TransportTypePayload
    const name = (body?.name || "").trim()
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 })

    const client = await clientPromise
    const db = client.db("manage_agency")
    const collection = db.collection("transport_types")

    const doc = { name, active: body.active !== false, createdAt: new Date(), updatedAt: new Date() }
    const result = await collection.insertOne(doc)
    return NextResponse.json({ id: String(result.insertedId) }, { status: 201 })
  } catch (error) {
    console.error("TransportTypes POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

