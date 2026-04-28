import { MONGODB_DB_NAME } from "@/lib/database-config"
import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function GET(request: Request) {
  try {
    const companyId = request.headers.get("x-company-id")?.trim()
    if (!companyId) {
      return NextResponse.json({ error: "Missing x-company-id header" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(MONGODB_DB_NAME)
    const collection = db.collection("vendors")
    
    // Fetch active vendors for the selection dropdown
    const vendors = await collection.find({
      companyId: companyId,
      active: { $ne: false }
    })
    .project({ _id: 1, name: 1 })
    .sort({ name: 1 })
    .toArray()

    const data = vendors.map((v: any) => ({
      value: String(v._id),
      label: v.name
    }))

    return NextResponse.json(data)
  } catch (error) {
    console.error("Vendor selection GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
