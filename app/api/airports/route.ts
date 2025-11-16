import { NextResponse } from 'next/server'
import airportsData from '../../../ariports.json'

type AirportItem = {
  airline_airport: string
  airline_iata_code: string
  country_name: string
}

// Normalize and dedupe airports
function getAirports() {
  const seen = new Set<string>()
  const items = (airportsData as AirportItem[])
    .filter((a) => a.airline_iata_code && a.airline_airport)
    .map((a) => ({
      code: a.airline_iata_code.trim(),
      name: a.airline_airport.trim().replace(/^\(|\)$/g, ''),
      country: a.country_name?.trim() || '',
    }))
    .filter((a) => {
      const key = `${a.code}|${a.name}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  return items
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') || '').toLowerCase().trim()
  const limit = parseInt(searchParams.get('limit') || '50', 10)

  let items = getAirports()
  if (q) {
    items = items.filter(
      (a) =>
        a.code.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.country.toLowerCase().includes(q)
    )
  }

  return NextResponse.json({ items: items.slice(0, Math.max(1, limit)) })
}