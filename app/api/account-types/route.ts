import { type NextRequest } from "next/server"
import { list, create } from "@/controllers/accountTypeController"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const search = (searchParams.get("search") || "").trim()
  return list(search || undefined)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  return create(body)
}
