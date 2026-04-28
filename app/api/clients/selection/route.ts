import { NextResponse } from "next/server"
import connectMongoose from "@/lib/mongoose"
import { Client } from "@/models/client"

export async function GET(request: Request) {
  try {
    const companyId = request.headers.get("x-company-id")?.trim()
    if (!companyId) {
      return NextResponse.json({ error: "Missing x-company-id header" }, { status: 400 })
    }

    await connectMongoose()
    
    // Fetch active clients for the selection dropdown
    const clients = await Client.find({
      companyId: companyId,
      active: { $ne: false }
    })
    .select("_id name uniqueId")
    .sort({ name: 1 })
    .lean()

    const data = clients.map((c: any) => ({
      value: String(c._id),
      label: c.uniqueId ? `${c.name} (${c.uniqueId})` : c.name
    }))

    return NextResponse.json(data)
  } catch (error) {
    console.error("Client selection GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
