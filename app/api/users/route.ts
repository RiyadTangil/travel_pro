import { NextResponse } from "next/server"

// Temporary stub users API for dropdown population
export async function GET() {
  const data = [
    { id: "u-1", name: "Admin User" },
    { id: "u-2", name: "Sales Lead" },
    { id: "u-3", name: "Support Agent" },
  ]
  return NextResponse.json({ data })
}