import { NextResponse } from 'next/server'
import airlinesData from '../../../airlines.json'

type AirlineItem = {
  airline_id: number
  airline_name: string
  agency_id: number | null
}

function getAirlines() {
  const seen = new Set<string>()
  const items = (airlinesData as AirlineItem[])
    .filter((a) => a.airline_name)
    .map((a) => ({ id: a.airline_id, name: a.airline_name.trim() }))
    .filter((a) => {
      if (seen.has(a.name)) return false
      seen.add(a.name)
      return true
    })
  return items
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') || '').toLowerCase().trim()
  const limit = parseInt(searchParams.get('limit') || '50', 10)

  let items = getAirlines()
  if (q) {
    items = items.filter((a) => a.name.toLowerCase().includes(q))
  }

  return NextResponse.json({ items: items.slice(0, Math.max(1, limit)) })
}