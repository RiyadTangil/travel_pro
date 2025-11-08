import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

// Collection name
const COLLECTION = "passports"

// GET - list passports with pagination and search
export async function GET(request: NextRequest) {
  try {
    const companyId = request.headers.get('x-company-id')
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const search = (searchParams.get("search") || "").trim()
    const status = (searchParams.get("status") || "").trim()
    const startDate = searchParams.get("startDate") || ""
    const endDate = searchParams.get("endDate") || ""

    const client = await clientPromise
    const db = client.db("manage_agency")
    const col = db.collection(COLLECTION)

    const filter: any = {}
    if (companyId) filter.companyId = companyId
    if (search) {
      filter.$or = [
        { passportNo: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ]
    }
    if (status && status !== "All") filter.status = status
    if (startDate) filter.createdAt = { ...(filter.createdAt || {}), $gte: new Date(startDate) }
    if (endDate) filter.createdAt = { ...(filter.createdAt || {}), $lte: new Date(endDate) }

    const total = await col.countDocuments(filter)
    const docs = await col
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray()

    return NextResponse.json({
      passports: docs.map(d => ({ ...d, id: String(d._id) })),
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    })
  } catch (error) {
    console.error("Passports GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - create passport
export async function POST(request: NextRequest) {
  try {
    const companyId = request.headers.get('x-company-id')
    const body = await request.json()
    const { clientId, passportNo, paxType, name, mobile, email, nid, dob, dateOfIssue, dateOfExpire, note } = body

    if (!passportNo || !name || !mobile) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("manage_agency")
    const col = db.collection(COLLECTION)

    const now = new Date()
    const doc = {
      clientId: clientId || null,
      passportNo,
      paxType: paxType || "",
      name,
      mobile,
      email: email || "",
      nid: nid || "",
      dob: dob || "",
      dateOfIssue: dateOfIssue || "",
      dateOfExpire: dateOfExpire || "",
      note: note || "",
      status: "PENDING",
      companyId: companyId || null,
      createdAt: now,
      updatedAt: now,
    }

    const result = await col.insertOne(doc)
    return NextResponse.json({ passport: { ...doc, id: String(result.insertedId) } }, { status: 201 })
  } catch (error) {
    console.error("Passports POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}