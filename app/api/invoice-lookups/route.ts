import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

// Aggregated lookups for Add Invoice modal
// Returns employees, agents, vendors, products, airlines, transportTypes, clients, accounts, airports, passports

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db("manage_agency")

    // Employees from global store (same source as /api/employees)
    const globalStore = globalThis as any
    const employeeList: any[] = Array.isArray(globalStore.__EMPLOYEES__) ? globalStore.__EMPLOYEES__ : []
    const employees = employeeList.map((e) => ({ id: String(e.id), name: e.name, department: e.department, designation: e.designation }))

    // Agents
    const agentsDocs = await db.collection("agents").find({}).sort({ createdAt: -1 }).limit(100).toArray()
    const agents = agentsDocs.map((a: any) => ({ id: String(a._id), name: a.name || "", mobile: a.mobile || a.phone || "", email: a.email || "" }))

    // Vendors
    const vendorDocs = await db.collection("vendors").find({}).sort({ createdAt: -1 }).limit(100).toArray()
    const vendors = vendorDocs.map((v: any) => ({ id: String(v._id), name: v.name || "", email: v.email || "", mobile: v.mobile || "" }))

    // Products (active only)
    const productDocs = await db.collection("products").find({ deleted: { $ne: true }, status: { $in: ["active", 1] } }).sort({ createdAt: -1 }).limit(200).toArray()
    const products = productDocs.map((p: any) => ({ id: String(p._id), name: p.name || p.product_name }))

    // Airlines from static JSON via the airlines API code path
    // Importing airlines.json directly to avoid extra API call
    const airlinesData = (await import("../../../airlines.json")).default as any[]
    const seen = new Set<string>()
    const airlines = airlinesData
      .filter((a) => a.airline_name)
      .map((a) => ({ id: String(a.airline_id), name: String(a.airline_name).trim() }))
      .filter((a) => { if (seen.has(a.name)) return false; seen.add(a.name); return true })
      .slice(0, 200)

    // Transport Types
    const ttDocs = await db.collection("transport_types").find({}).sort({ createdAt: -1 }).limit(100).toArray()
    const transportTypes = ttDocs.map((t: any) => ({ id: String(t._id), name: t.name, active: t.active !== false }))

    // Clients (limited to avoid heavy payload)
    const clientsDocs = await db.collection("clients_manager").find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 }).limit(50).toArray()
    const clients = clientsDocs.map((c: any) => ({ id: String(c._id), name: c.name || "", uniqueId: c.uniqueId || undefined, email: c.email || "", phone: c.phone || "" }))

    // Accounts (limited)
    const accountsDocs = await db.collection("accounts").find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 }).limit(200).toArray()
    const accounts = accountsDocs.map((a: any) => ({ id: String(a._id ?? a.id ?? a.name), name: String(a.name || ""), type: String(a.type || "") }))

    // Airports from static JSON (same normalization as /api/airports)
    const airportsData = (await import("../../../ariports.json")).default as any[]
    type AirportItem = { airline_airport: string; airline_iata_code: string; country_name?: string }
    const seenAir = new Set<string>()
    const airports = (airportsData as AirportItem[])
      .filter((a) => a.airline_iata_code && a.airline_airport)
      .map((a) => ({ code: String(a.airline_iata_code).trim(), name: String(a.airline_airport).trim().replace(/^\(|\)$/g, ''), country: (a.country_name || '').trim() }))
      .filter((a) => { const key = `${a.code}|${a.name}`; if (seenAir.has(key)) return false; seenAir.add(key); return true })
      .slice(0, 500)

    // Passports (limited)
    const passportsDocs = await db.collection("passports").find({}).sort({ createdAt: -1 }).limit(200).toArray()
    const passports = passportsDocs.map((p: any) => ({
      id: String(p._id ?? p.id),
      passportNo: String(p.passportNo || ""),
      name: p.name || "",
      mobile: p.mobile || "",
      email: p.email || "",
      dob: typeof p.dob === "string" ? p.dob : (p.dob ? new Date(p.dob).toISOString().slice(0,10) : undefined),
      dateOfIssue: typeof p.dateOfIssue === "string" ? p.dateOfIssue : (p.dateOfIssue ? new Date(p.dateOfIssue).toISOString().slice(0,10) : undefined),
      dateOfExpire: typeof p.dateOfExpire === "string" ? p.dateOfExpire : (p.dateOfExpire ? new Date(p.dateOfExpire).toISOString().slice(0,10) : undefined),
    }))

    return NextResponse.json({ employees, agents, vendors, products, airlines, transportTypes, clients, accounts, airports, passports })
  } catch (error) {
    console.error("Invoice lookups GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
