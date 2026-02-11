
import { NextResponse } from "next/server"
import { getClientsTotalDueAdvance } from "@/services/reportService"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date") || ""
    const clientId = searchParams.get("clientId") || undefined
    
    // If clientId is "all" or empty, pass undefined to service
    const cid = (clientId && clientId !== "all") ? clientId : undefined

    const data = await getClientsTotalDueAdvance(date, cid)
    
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Error fetching total due/advance:", error)
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
  }
}
