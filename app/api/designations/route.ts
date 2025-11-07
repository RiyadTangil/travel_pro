import { NextResponse } from "next/server"

// Temporary stub API to provide available designations
export async function GET() {
  const data = [
    "Chief Executive Officer (CEO)",
    "Chief Operating Officer (COO)",
    "Director",
    "General Manager",
    "Assistant General Manager",
    "Manager",
    "Assistant Manager",
    "Senior Executive",
    "Executive",
    "Officer",
    "Coordinator",
    "Team Lead",
    "Sales Executive",
    "Customer Support Agent",
    "Reservation Officer",
    "Ticketing Officer",
    "Finance Officer",
    "HR Officer",
    "IT Support",
    "Developer",
    "QA Engineer",
    "Marketing Specialist",
    "Intern",
  ]
  return NextResponse.json({ data })
}