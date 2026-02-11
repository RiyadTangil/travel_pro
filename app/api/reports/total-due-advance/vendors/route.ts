
import { NextResponse } from "next/server"
import { getVendorsTotalDueAdvance } from "@/services/vendorReportService"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date") || ""
    const vendorId = searchParams.get("vendorId") || undefined
    
    const vid = (vendorId && vendorId !== "all") ? vendorId : undefined

    const data = await getVendorsTotalDueAdvance(date, vid)
    
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Error fetching vendor due/advance:", error)
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
  }
}
