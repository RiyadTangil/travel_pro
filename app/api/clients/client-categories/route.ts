import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

// Mongo-backed client categories API
// Collection: client_categories

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number(searchParams.get("page") || 1)
    const pageSize = Number(searchParams.get("pageSize") || 10)
    const skip = (page - 1) * pageSize
    const companyId = request.headers.get("x-company-id") || null

    const client = await clientPromise
    const db = client.db("manage_agency")
    const collection = db.collection("client_categories")

    const query: any = {}
    if (companyId) query.companyId = companyId

    const total = await collection.countDocuments(query)
    const docs = await collection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .toArray()

    const data = docs.map((d: any) => ({ id: String(d._id), name: d.name, prefix: d.prefix || "", status: d.status || "active", companyId: d.companyId || null }))
    return NextResponse.json({ data, total, page, pageSize })
  } catch (error) {
    console.error("Client categories GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body?.name || !String(body.name).trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("manage_agency")
    const collection = db.collection("client_categories")

    const doc = {
      name: String(body.name).trim(),
      prefix: String(body.prefix || "").trim(),
      status: body.status === "inactive" ? "inactive" : "active",
      companyId: body.companyId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await collection.insertOne(doc)
    const data = { id: String(result.insertedId), name: doc.name, prefix: doc.prefix, status: doc.status, companyId: doc.companyId }
    return NextResponse.json({ data })
  } catch (error) {
    console.error("Client categories POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}