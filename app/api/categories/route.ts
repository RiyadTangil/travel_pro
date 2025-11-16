import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

// Mongo-backed categories API
// Collection: categories

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number(searchParams.get("page") || 1)
    const pageSize = Number(searchParams.get("pageSize") || 10)
    const skip = (page - 1) * pageSize
    const companyId = request.headers.get("x-company-id") || null

    const client = await clientPromise
    const db = client.db("manage_agency")
    const collection = db.collection("categories")

    const query: any = {}
    if (companyId) query.companyId = companyId

    const total = await collection.countDocuments(query)
    const docs = await collection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .toArray()

    const data = docs.map((d: any) => ({ id: String(d._id), name: d.name, companyId: d.companyId || null }))
    return NextResponse.json({ data, total, page, pageSize })
  } catch (error) {
    console.error("Categories GET error:", error)
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
    const collection = db.collection("categories")

    const doc = {
      name: String(body.name).trim(),
      companyId: body.companyId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await collection.insertOne(doc)
    const data = { id: String(result.insertedId), name: doc.name, companyId: doc.companyId }
    return NextResponse.json({ data })
  } catch (error) {
    console.error("Categories POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}