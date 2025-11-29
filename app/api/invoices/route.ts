import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

const COLLECTION = "invoices"
const INVOICE_ITEMS = "invoice_items"
const INVOICE_TICKETS = "invoice_tickets"
const INVOICE_HOTELS = "invoice_hotels"
const INVOICE_TRANSPORTS = "invoice_transports"
const INVOICE_PASSPORTS = "invoice_passports"
const CLIENTS_COLLECTION = "clients_manager"
const EMPLOYEES_COLLECTION = "employees"
const AGENTS_COLLECTION = "agents"
const AIRLINES_COLLECTION = "airlines"
const TRANSPORT_TYPES_COLLECTION = "transport_types"

function parseNumber(n: any, def = 0): number { const x = Number(n); return isFinite(x) ? x : def }

// GET /api/invoices - list
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number(searchParams.get("page") || 1)
    const pageSize = Number(searchParams.get("pageSize") || 20)
    const search = (searchParams.get("search") || "").trim()
    const status = (searchParams.get("status") || "").trim()
    const dateFrom = searchParams.get("dateFrom") || undefined
    const dateTo = searchParams.get("dateTo") || undefined

    const client = await clientPromise
    const db = client.db("manage_agency")
    const col = db.collection(COLLECTION)

    const filter: any = {}
    if (search) {
      filter.$or = [
        { invoiceNo: { $regex: search, $options: "i" } },
        { clientName: { $regex: search, $options: "i" } },
        { passportNo: { $regex: search, $options: "i" } },
        { salesByName: { $regex: search, $options: "i" } },
      ]
    }
    if (status) filter.status = status
    if (dateFrom || dateTo) {
      filter.salesDate = {}
      if (dateFrom) (filter.salesDate as any).$gte = dateFrom
      if (dateTo) (filter.salesDate as any).$lte = dateTo
    }

    const total = await col.countDocuments(filter)
    const docs = await col
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray()

    const items = docs.map((d: any) => ({
      id: String(d._id),
      invoiceNo: d.invoiceNo,
      clientName: d.clientName || "",
      clientPhone: d.clientPhone || "",
      salesDate: d.salesDate,
      dueDate: d.dueDate || "",
      salesPrice: parseNumber(d.netTotal, 0),
      receivedAmount: parseNumber(d.receivedAmount, 0),
      dueAmount: Math.max(0, parseNumber(d.netTotal, 0) - parseNumber(d.receivedAmount, 0)),
      mrNo: d.mrNo || "",
      passportNo: d.passportNo || "",
      salesBy: d.salesByName || "",
      agent: d.agentName || "",
      status: d.status || "due",
      createdAt: d.createdAt || new Date().toISOString(),
      updatedAt: d.updatedAt || new Date().toISOString(),
    }))

    return NextResponse.json({ items, pagination: { page, pageSize, total } })
  } catch (error) {
    console.error("Invoices GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Util: resolve names for denormalization
async function resolveNames(db: any, ids: { clientId?: string; employeeId?: string; agentId?: string }) {
  const out: any = {}
  const { clientId, employeeId, agentId } = ids
  if (clientId && ObjectId.isValid(clientId)) {
    const c = await db.collection(CLIENTS_COLLECTION).findOne({ _id: new ObjectId(clientId) })
    if (c) { out.clientName = c.name || ""; out.clientPhone = c.phone || ""; out.clientUniqueId = c.uniqueId }
  }
  if (employeeId && ObjectId.isValid(employeeId)) {
    const e = await db.collection(EMPLOYEES_COLLECTION).findOne({ _id: new ObjectId(employeeId) })
    if (e) out.salesByName = e.name || e.fullName || ""
  }
  if (agentId && ObjectId.isValid(agentId)) {
    const a = await db.collection(AGENTS_COLLECTION).findOne({ _id: new ObjectId(agentId) })
    if (a) out.agentName = a.name || ""
  }
  return out
}

// Util: resolve airline/transport type ids by name when provided
async function resolveLookups(db: any, payload: any) {
  const out = { tickets: payload.tickets || [], transports: payload.transports || [] }
  if (Array.isArray(out.tickets)) {
    out.tickets = await Promise.all(out.tickets.map(async (t: any) => {
      if (t.airline && !t.airlineId) {
        const a = await db.collection(AIRLINES_COLLECTION).findOne({ name: t.airline })
        if (a) t.airlineId = String(a._id)
      }
      return t
    }))
  }
  if (Array.isArray(out.transports)) {
    out.transports = await Promise.all(out.transports.map(async (tr: any) => {
      if (tr.transportType && !tr.transportTypeId) {
        const tt = await db.collection(TRANSPORT_TYPES_COLLECTION).findOne({ name: tr.transportType })
        if (tt) tr.transportTypeId = String(tt._id)
      }
      return tr
    }))
  }
  return out
}

// POST /api/invoices - create
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions as any)
    const companyId = session?.user?.companyId || null
    const body = await request.json()
    // Accept flexible shapes: either {general, billing, tickets, hotels, transports, passports, moneyReceipt}
    // or flat sample payload from provided website. Normalize below.
    const general = body.general || body
  const billing = body.billing || { items: body.billing_information || [] }
    const tickets = body.ticket || body.ticketInfo || []
    const hotels = body.hotel || body.hotel_information || []
    const transports = body.transport || body.transport_information || []
    const passports = body.passport || body.passport_information || []

    const invoiceNo = String(general.invoice_no || general.invoiceNo || "").trim()
    const clientId = String(general.invoice_combclient_id || general.client || "").trim()
    const employeeId = String(general.invoice_sales_man_id || general.salesBy || "").trim()
    const agentId = general.invoice_agent_id ? String(general.invoice_agent_id) : (general.agent || "")
    const salesDate = String(general.invoice_sales_date || general.salesDate || new Date().toISOString())
    const dueDate = general.invoice_due_date || general.dueDate || ""
    const showPrevDue = !!(general.invoice_show_prev_due || body.showPrevDue)
    const showDiscount = !!(general.invoice_show_discount || body.showDiscount)

  const subtotal = parseNumber(billing.subtotal ?? body.invoice_sub_total ?? (Array.isArray(billing.items) ? billing.items.reduce((s: number, i: any) => s + parseNumber(i.billing_subtotal ?? i.totalSales ?? 0), 0) : 0))
  const discount = parseNumber(billing.discount ?? body.billing_discount ?? body.discount ?? 0)
  const serviceCharge = parseNumber(billing.serviceCharge ?? body.service_charge ?? 0)
  const vatTax = parseNumber(billing.vatTax ?? body.vat_tax ?? 0)
  const netTotal = parseNumber(body.invoice_net_total ?? (billing.netTotal ?? (subtotal - discount + serviceCharge + vatTax)))
  const agentCommission = parseNumber(body.invoice_agent_com_amount ?? 0)
  const clientPreviousDue = parseNumber(body.invoice_client_previous_due ?? 0)
  const note = typeof billing.note !== 'undefined' ? String(billing.note || '') : (typeof body.billing_note !== 'undefined' ? String(body.billing_note || '') : '')
  const reference = typeof billing.reference !== 'undefined' ? String(billing.reference || '') : (typeof body.billing_reference !== 'undefined' ? String(body.billing_reference || '') : '')

    const client = await clientPromise
    const db = client.db("manage_agency")

    // Credit limit check
    let clientDoc: any = null
    if (ObjectId.isValid(clientId)) {
      clientDoc = await db.collection(CLIENTS_COLLECTION).findOne({ _id: new ObjectId(clientId) })
    } else if (clientId.startsWith("client-")) {
      const uniqueId = Number(clientId.replace("client-", ""))
      clientDoc = await db.collection(CLIENTS_COLLECTION).findOne({ uniqueId })
    }
    if (!clientDoc) return NextResponse.json({ error: "Client not found" }, { status: 404 })
    const creditLimit = parseNumber(clientDoc.creditLimit || 0)
    const presentBalance = parseNumber(clientDoc.presentBalance || 0)
    if (creditLimit > 0 && presentBalance + netTotal > creditLimit) {
      return NextResponse.json({ error: "credit_limit_exceeded", creditLimit, presentBalance, attemptAmount: netTotal }, { status: 400 })
    }

    // Resolve denormalized names for quick list rendering
    const names = await resolveNames(db, { clientId: String(clientDoc._id), employeeId: employeeId && ObjectId.isValid(employeeId) ? employeeId : undefined, agentId: agentId && ObjectId.isValid(agentId) ? agentId : undefined })
    if (!names.salesByName && general.salesByName) names.salesByName = String(general.salesByName)

    // Resolve lookups for airline & transport types
    const lookups = await resolveLookups(db, { tickets, transports })

    // Normalize billing items to store vendor references
    const billingItems = (Array.isArray(billing.items) ? billing.items : []).map((i: any) => ({
      product: i.product || i.billing_product_id || "",
      paxName: i.paxName || i.pax_name || "",
      description: i.description || i.billing_description || "",
      quantity: parseNumber(i.quantity ?? i.billing_quantity ?? 1),
      unitPrice: parseNumber(i.unitPrice ?? i.billing_unit_price ?? 0),
      costPrice: parseNumber(i.costPrice ?? i.billing_cost_price ?? 0),
      totalSales: parseNumber(i.totalSales ?? i.billing_total_sales ?? i.billing_subtotal ?? 0),
      totalCost: parseNumber(i.totalCost ?? 0),
      profit: parseNumber(i.profit ?? i.billing_profit ?? 0),
      vendorId: i.vendor || i.billing_comvendor || "",
    }))

    // Basic status based on payments (not implemented yet)
    const receivedAmount = 0
    const status = receivedAmount >= netTotal ? "paid" : receivedAmount > 0 ? "partial" : "due"

    const now = new Date().toISOString()
    const doc = {
      invoiceNo,
      salesDate,
      dueDate,
      clientId: String(clientDoc._id),
      employeeId: employeeId || undefined,
      agentId: agentId || undefined,
      companyId,
      ...names,
      // store only summarized billing totals in header, include notes
      billing: { subtotal, discount, serviceCharge, vatTax, netTotal, note, reference },
      showPrevDue,
      showDiscount,
      agentCommission,
      clientPreviousDue,
      netTotal,
      receivedAmount,
      status,
      createdAt: now,
      updatedAt: now,
    }

    const result = await db.collection(COLLECTION).insertOne(doc)
    const invoiceId = String(result.insertedId)

    // Insert child collections (non-transactional for simplicity)
    if (billingItems.length) {
      await db.collection(INVOICE_ITEMS).insertMany(billingItems.map((i: any) => ({ ...i, invoiceId, companyId, createdAt: now, updatedAt: now })))
    }
    if (Array.isArray(lookups.tickets) && lookups.tickets.length) {
      await db.collection(INVOICE_TICKETS).insertMany(lookups.tickets.map((t: any) => ({ ...t, invoiceId, companyId, createdAt: now, updatedAt: now })))
    }
    if (Array.isArray(hotels) && hotels.length) {
      await db.collection(INVOICE_HOTELS).insertMany(hotels.map((h: any) => ({ ...h, invoiceId, companyId, createdAt: now, updatedAt: now })))
    }
    if (Array.isArray(lookups.transports) && lookups.transports.length) {
      await db.collection(INVOICE_TRANSPORTS).insertMany(lookups.transports.map((tr: any) => ({ ...tr, invoiceId, companyId, createdAt: now, updatedAt: now })))
    }
    if (Array.isArray(passports) && passports.length) {
      await db.collection(INVOICE_PASSPORTS).insertMany(passports.map((p: any) => ({ ...p, invoiceId, companyId, createdAt: now, updatedAt: now })))
    }

    // Update client's presentBalance
    await db.collection(CLIENTS_COLLECTION).updateOne({ _id: clientDoc._id }, { $set: { presentBalance: presentBalance + netTotal, updatedAt: now } })

    const response = {
      invoice_id: Number(String(result.insertedId).slice(-6)), // pseudo numeric id for preview
      invoice_org_agency: null,
      invoice_no: invoiceNo,
      net_total: String(netTotal.toFixed(2)),
      invoice_client_id: clientDoc.uniqueId || null,
      invoice_combined_id: null,
      comb_client: clientDoc.uniqueId ? `client-${clientDoc.uniqueId}` : null,
      invoice_total_profit: String(billingItems.reduce((s: number, i: any) => s + parseNumber(i.profit), 0).toFixed(2)),
      invoice_total_vendor_price: String(billingItems.reduce((s: number, i: any) => s + parseNumber(i.costPrice) * parseNumber(i.quantity), 0).toFixed(2)),
      invoice_sales_date: salesDate,
      invoice_date: salesDate,
      invoice_due_date: dueDate || null,
      invoice_is_refund: 0,
      client_name: names.clientName || "",
      mobile: names.clientPhone || null,
      invclientpayment_amount: String(receivedAmount.toFixed(2)),
      money_receipt_num: "",
      passport_no: null,
      passport_name: null,
      sales_by: names.salesByName || "",
    }

    return NextResponse.json({ ok: true, id: invoiceId, created: response }, { status: 201 })
  } catch (error) {
    console.error("Invoices POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

