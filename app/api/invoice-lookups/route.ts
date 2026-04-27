import { MONGODB_DB_NAME } from "@/lib/database-config"
import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { Client } from "@/models/client"

// Aggregated lookups for Add Invoice modal (all DB lists scoped by x-company-id).
// Static: airlines, airports. Requires x-company-id for tenant collections.

/** companyId equality as string or ObjectId (matches mixed legacy data) */
function companyOrClauses(companyId: string): Record<string, unknown>[] {
  const cid = String(companyId).trim()
  const or: Record<string, unknown>[] = [{ companyId: cid }]
  if (ObjectId.isValid(cid)) {
    or.push({ companyId: new ObjectId(cid) })
  }
  return or
}

function companyMatch(companyId: string) {
  return { $or: companyOrClauses(companyId) }
}

function andCompany(base: Record<string, unknown>, companyId: string) {
  return { $and: [base, companyMatch(companyId)] }
}

export async function GET(request: Request) {
  try {
    const companyIdHeader = request.headers.get("x-company-id")?.trim()
    if (!companyIdHeader) {
      return NextResponse.json({ error: "Missing x-company-id header" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(MONGODB_DB_NAME)

    // Employees (same collection as /api/employees)
    const employeeDocs = await db
      .collection("employees")
      .find(companyMatch(companyIdHeader))
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray()
    const employees = employeeDocs.map((e: any) => ({
      id: String(e._id),
      name: e.name,
      department: e.department,
      designation: e.designation,
    }))

    const agentsDocs = await db
      .collection("agents")
      .find(companyMatch(companyIdHeader))
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray()
    const agents = agentsDocs.map((a: any) => ({
      id: String(a._id),
      name: a.name || "",
      mobile: a.mobile || a.phone || "",
      email: a.email || "",
    }))

    const vendorDocs = await db
      .collection("vendors")
      .find(companyMatch(companyIdHeader))
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray()
    const vendors = vendorDocs.map((v: any) => ({
      id: String(v._id),
      name: v.name || "",
      email: v.email || "",
      mobile: v.mobile || "",
    }))

    const productDocs = await db
      .collection("products")
      .find(
        andCompany({ deleted: { $ne: true }, status: { $in: ["active", 1] } }, companyIdHeader)
      )
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray()
    const products = productDocs.map((p: any) => ({ id: String(p._id), name: p.name || p.product_name }))

    const airlinesData = (await import("../../../airlines.json")).default as any[]
    const seen = new Set<string>()
    const airlines = airlinesData
      .filter((a) => a.airline_name)
      .map((a) => ({ id: String(a.airline_id), name: String(a.airline_name).trim() }))
      .filter((a) => {
        if (seen.has(a.name)) return false
        seen.add(a.name)
        return true
      })
      .slice(0, 200)

    // Transport types: tenant rows + legacy catalog rows without companyId
    const ttDocs = await db
      .collection("transport_types")
      .find({
        $or: [...companyOrClauses(companyIdHeader), { companyId: { $exists: false } }, { companyId: null }],
      })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray()
    const transportTypes = ttDocs.map((t: any) => ({ id: String(t._id), name: t.name, active: t.active !== false }))

    const clientsDocs = await
      Client.find(andCompany({ isDeleted: { $ne: true } }, companyIdHeader))
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    const clients = clientsDocs.map((c: any) => ({
      id: String(c._id),
      name: c.name || "",
      uniqueId: c.uniqueId || undefined,
      email: c.email || "",
      phone: c.phone || "",
      presentBalance: c.presentBalance || 0,
      invoiceDue: c.invoiceDue || 0,
    }))

    const accountsDocs = await db
      .collection("accounts")
      .find(andCompany({ isDeleted: { $ne: true } }, companyIdHeader))
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray()
    const accounts = accountsDocs.map((a: any) => ({
      id: String(a._id ?? a.id ?? a.name),
      name: String(a.name || ""),
      type: String(a.type || ""),
      lastBalance: typeof a.lastBalance === "number" ? a.lastBalance : Number(a.lastBalance || 0),
    }))

    const airportsData = (await import("../../../ariports.json")).default as any[]
    type AirportItem = { airline_airport: string; airline_iata_code: string; country_name?: string }
    const seenAir = new Set<string>()
    const airports = (airportsData as AirportItem[])
      .filter((a) => a.airline_iata_code && a.airline_airport)
      .map((a) => ({
        code: String(a.airline_iata_code).trim(),
        name: String(a.airline_airport).trim().replace(/^\(|\)$/g, ""),
        country: (a.country_name || "").trim(),
      }))
      .filter((a) => {
        const key = `${a.code}|${a.name}`
        if (seenAir.has(key)) return false
        seenAir.add(key)
        return true
      })
      .slice(0, 500)

    const passportsDocs = await db
      .collection("passports")
      .find(companyMatch(companyIdHeader))
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray()
    const passports = passportsDocs.map((p: any) => ({
      id: String(p._id ?? p.id),
      passportNo: String(p.passportNo || ""),
      name: p.name || "",
      mobile: p.mobile || "",
      email: p.email || "",
      dob: typeof p.dob === "string" ? p.dob : p.dob ? new Date(p.dob).toISOString().slice(0, 10) : undefined,
      dateOfIssue:
        typeof p.dateOfIssue === "string" ? p.dateOfIssue : p.dateOfIssue ? new Date(p.dateOfIssue).toISOString().slice(0, 10) : undefined,
      dateOfExpire:
        typeof p.dateOfExpire === "string" ? p.dateOfExpire : p.dateOfExpire ? new Date(p.dateOfExpire).toISOString().slice(0, 10) : undefined,
    }))

    return NextResponse.json({
      employees,
      agents,
      vendors,
      products,
      airlines,
      transportTypes,
      clients,
      accounts,
      airports,
      passports,
    })
  } catch (error) {
    console.error("Invoice lookups GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
