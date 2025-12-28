import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

type AccountTypeDoc = { _id: any; name: string; companyId?: string }

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const search = (url.searchParams.get("search") || "").trim()
    const companyId = (request.headers as any).get?.("x-company-id") || undefined

    const client = await clientPromise
    const db = client.db("manage_agency")
    const col = db.collection("account_types")

    const filter: any = {}
    if (companyId) filter.companyId = companyId
    if (search) filter.name = { $regex: search, $options: "i" }

    const docs: AccountTypeDoc[] = await col.find(filter).sort({ name: 1 }).toArray()
    const items = docs.map(d => ({ id: String(d._id), name: d.name }))

    return NextResponse.json({ items })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to list account types" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const name = String(body.name || "").trim()
    const companyId = (request.headers as any).get?.("x-company-id") || undefined
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 })

    const client = await clientPromise
    const db = client.db("manage_agency")
    const col = db.collection("account_types")

    const doc = { name, ...(companyId ? { companyId } : {}) }
    const res = await col.insertOne(doc as any)
    return NextResponse.json({ id: String(res.insertedId), name }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to create account type" }, { status: 500 })
  }
}
