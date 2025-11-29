import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

const COLLECTION = "invoices"
const CLIENTS_COLLECTION = "clients_manager"
const INVOICE_ITEMS = "invoice_items"
const INVOICE_TICKETS = "invoice_tickets"
const INVOICE_HOTELS = "invoice_hotels"
const INVOICE_TRANSPORTS = "invoice_transports"
const INVOICE_PASSPORTS = "invoice_passports"

const EMPLOYEES_COLLECTION = "employees"
const AGENTS_COLLECTION = "agents"
const VENDORS_COLLECTION = "vendors"

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await (params as any)
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
    const session = await getServerSession(authOptions as any)
    const companyId = session?.user?.companyId || null
    const client = await clientPromise
    const db = client.db("manage_agency")
    const headerQuery: any = { _id: new ObjectId(id) }
    if (companyId) headerQuery.companyId = companyId
    const doc = await db.collection(COLLECTION).findOne(headerQuery)
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const invoiceId = String(doc._id)
    // Populate denormalized names if missing to avoid extra client/employee/agent calls
    const denorm: any = {}
    if (!doc.clientName && doc.clientId && ObjectId.isValid(doc.clientId)) {
      const c = await db.collection(CLIENTS_COLLECTION).findOne({ _id: new ObjectId(doc.clientId) })
      if (c) { denorm.clientName = c.name || ""; denorm.clientPhone = c.phone || "" }
    }
    if (!doc.salesByName && doc.employeeId && ObjectId.isValid(doc.employeeId)) {
      const e = await db.collection(EMPLOYEES_COLLECTION).findOne({ _id: new ObjectId(doc.employeeId) })
      if (e) denorm.salesByName = e.name || e.fullName || ""
    }
    if (!doc.agentName && doc.agentId && ObjectId.isValid(doc.agentId)) {
      const a = await db.collection(AGENTS_COLLECTION).findOne({ _id: new ObjectId(doc.agentId) })
      if (a) denorm.agentName = a.name || ""
    }
    const [items, tickets, hotels, transports, passports] = await Promise.all([
      db.collection(INVOICE_ITEMS).find({ invoiceId }).toArray(),
      db.collection(INVOICE_TICKETS).find({ invoiceId }).toArray(),
      db.collection(INVOICE_HOTELS).find({ invoiceId }).toArray(),
      db.collection(INVOICE_TRANSPORTS).find({ invoiceId }).toArray(),
      db.collection(INVOICE_PASSPORTS).find({ invoiceId }).toArray(),
    ])
    // Gather referenced vendors from billing items to avoid extra calls on edit
    const vendorIdStrings = Array.from(new Set((items || []).map((i: any) => String(i.vendorId || i.vendor || "")).filter((s) => s && ObjectId.isValid(s))))
    const vendorObjectIds = vendorIdStrings.map((s) => new ObjectId(s))
    const vendorDocs = vendorObjectIds.length ? await db.collection(VENDORS_COLLECTION).find({ _id: { $in: vendorObjectIds } }).toArray() : []
    const vendors = vendorDocs.map((v: any) => ({ id: String(v._id), name: v.name || "", email: v.email || "", mobile: v.mobile || "" }))
    // Include the employee detail to seed the selector without an extra fetch
    let employees: any[] = []
    if (doc.employeeId && ObjectId.isValid(doc.employeeId)) {
      const e = await db.collection(EMPLOYEES_COLLECTION).findOne({ _id: new ObjectId(doc.employeeId) })
      if (e) {
        employees = [{ id: String(e._id), name: e.name || e.fullName || "", department: e.department || "", designation: e.designation || "", mobile: e.mobile || "", email: e.email || "" }]
        // backfill salesByName if still missing
        if (!denorm.salesByName) denorm.salesByName = e.name || e.fullName || ""
      }
    }
    return NextResponse.json({ invoice: { ...doc, ...denorm, id: invoiceId, billing: { ...(doc as any).billing, items }, tickets, hotels, transports, passports }, vendors, employees })
  } catch (error) {
    console.error("Invoices [id] GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await (params as any)
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
  const body = await request.json()
  const now = new Date().toISOString()
  const general = body.general || {}
  const billing = body.billing || {}
  const headerUpdates: any = {
      invoiceNo: String(general.invoiceNo || general.invoice_no || '').trim() || undefined,
      clientId: general.client || general.invoice_combclient_id || undefined,
      employeeId: general.salesBy || general.invoice_sales_man_id || undefined,
      agentId: general.agent || general.invoice_agent_id || undefined,
      salesByName: general.salesByName || undefined,
      salesDate: general.salesDate || general.invoice_sales_date || undefined,
      dueDate: general.dueDate || general.invoice_due_date || undefined,
      billing: {
        subtotal: billing.subtotal ?? undefined,
        discount: billing.discount ?? undefined,
        serviceCharge: billing.serviceCharge ?? undefined,
        vatTax: billing.vatTax ?? undefined,
        netTotal: billing.netTotal ?? undefined,
        note: typeof billing.note !== 'undefined' ? String(billing.note || '') : undefined,
        reference: typeof billing.reference !== 'undefined' ? String(billing.reference || '') : undefined,
      },
      updatedAt: now,
    }
    const session = await getServerSession(authOptions as any)
    const companyId = session?.user?.companyId || null
    const client = await clientPromise
    const db = client.db("manage_agency")
    const col = db.collection(COLLECTION)
    const prevQuery: any = { _id: new ObjectId(id) }
    if (companyId) prevQuery.companyId = companyId
    const prev = await col.findOne(prevQuery)
    if (!prev) return NextResponse.json({ error: "Not found" }, { status: 404 })

    // If netTotal changes, adjust client's presentBalance delta
    let delta = 0
    const newNetCandidate = billing.netTotal ?? body.netTotal
    if (typeof newNetCandidate === "number") {
      const oldNet = Number(prev.netTotal || 0)
      const newNet = Number(newNetCandidate)
      delta = newNet - oldNet
    }
    // Remove arrays from header update payload, they live in child collections
    const childItems = {
      billingItems: Array.isArray(body.billing?.items) ? body.billing.items : (Array.isArray((body as any).billingItems) ? (body as any).billingItems : undefined),
      tickets: Array.isArray(body.tickets) ? body.tickets : undefined,
      hotels: Array.isArray(body.hotels) ? body.hotels : undefined,
      transports: Array.isArray(body.transports) ? body.transports : undefined,
      passports: Array.isArray(body.passports) ? body.passports : undefined,
    }
    const res = await col.updateOne(prevQuery, { $set: headerUpdates })
    if (res.matchedCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })

    if (delta !== 0 && prev.clientId && ObjectId.isValid(prev.clientId)) {
      await db.collection(CLIENTS_COLLECTION).updateOne(
        { _id: new ObjectId(prev.clientId) },
        { $inc: { presentBalance: delta }, $set: { updatedAt: now } }
      )
    }

    const invoiceId = String(prev._id)
    // Replace child collections sequentially to avoid race conditions with delete/insert
    const stripId = (doc: any) => { const { _id, ...rest } = doc || {}; return rest }
    if (childItems.billingItems) {
      await db.collection(INVOICE_ITEMS).deleteMany({ invoiceId })
      const docs = childItems.billingItems.map((i: any, idx: number) => ({ ...stripId(i), invoiceId, companyId: companyId || undefined, id: i.id || String(Date.now() + idx), updatedAt: now }))
      if (docs.length) await db.collection(INVOICE_ITEMS).insertMany(docs)
    }
    if (childItems.tickets) {
      await db.collection(INVOICE_TICKETS).deleteMany({ invoiceId })
      const docs = childItems.tickets.map((t: any, idx: number) => ({ ...stripId(t), invoiceId, companyId: companyId || undefined, id: t.id || String(Date.now() + idx), updatedAt: now }))
      if (docs.length) await db.collection(INVOICE_TICKETS).insertMany(docs)
    }
    if (childItems.hotels) {
      await db.collection(INVOICE_HOTELS).deleteMany({ invoiceId })
      const docs = childItems.hotels.map((h: any, idx: number) => ({ ...stripId(h), invoiceId, companyId: companyId || undefined, id: h.id || String(Date.now() + idx), updatedAt: now }))
      if (docs.length) await db.collection(INVOICE_HOTELS).insertMany(docs)
    }
    if (childItems.transports) {
      await db.collection(INVOICE_TRANSPORTS).deleteMany({ invoiceId })
      const docs = childItems.transports.map((tr: any, idx: number) => ({ ...stripId(tr), invoiceId, companyId: companyId || undefined, id: tr.id || String(Date.now() + idx), updatedAt: now }))
      if (docs.length) await db.collection(INVOICE_TRANSPORTS).insertMany(docs)
    }
    if (childItems.passports) {
      await db.collection(INVOICE_PASSPORTS).deleteMany({ invoiceId })
      const docs = childItems.passports.map((p: any, idx: number) => ({ ...stripId(p), invoiceId, companyId: companyId || undefined, id: p.id || String(Date.now() + idx), updatedAt: now }))
      if (docs.length) await db.collection(INVOICE_PASSPORTS).insertMany(docs)
    }
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error("Invoices [id] PUT error:", error)
    if (error && typeof error === "object" && Number(error.code) === 11000) {
      return NextResponse.json({ error: "duplicate_key", message: "Duplicate child record key detected.", code: 11000 }, { status: 409 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await (params as any)
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
    const session = await getServerSession(authOptions as any)
    const companyId = session?.user?.companyId || null
    const client = await clientPromise
    const db = client.db("manage_agency")
    const col = db.collection(COLLECTION)
    const headerQuery: any = { _id: new ObjectId(id) }
    if (companyId) headerQuery.companyId = companyId
    const doc = await col.findOne(headerQuery)
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const res = await col.deleteOne(headerQuery)
    if (res.deletedCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const invoiceId = String(doc._id)
    // Cascade delete child collections
    await Promise.all([
      db.collection(INVOICE_ITEMS).deleteMany({ invoiceId }),
      db.collection(INVOICE_TICKETS).deleteMany({ invoiceId }),
      db.collection(INVOICE_HOTELS).deleteMany({ invoiceId }),
      db.collection(INVOICE_TRANSPORTS).deleteMany({ invoiceId }),
      db.collection(INVOICE_PASSPORTS).deleteMany({ invoiceId }),
    ])
    // Revert client's presentBalance
    const net = Number(doc.netTotal || 0)
    if (net && doc.clientId && ObjectId.isValid(doc.clientId)) {
      await db.collection(CLIENTS_COLLECTION).updateOne(
        { _id: new ObjectId(doc.clientId) },
        { $inc: { presentBalance: -net }, $set: { updatedAt: new Date().toISOString() } }
      )
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Invoices [id] DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
