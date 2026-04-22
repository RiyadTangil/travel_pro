import { InvoiceItem } from "@/models/invoice-item"
import "@/models/invoice"
import "@/models/vendor"
import { Vendor } from "@/models/vendor"
import { VendorPayment } from "@/models/vendor-payment"
import { VendorPaymentAllocation } from "@/models/vendor-payment-allocation"
import { ClientTransaction } from "@/models/client-transaction"
import { Account } from "@/models/account"
import { Counter } from "@/models/counter"
import { AppError } from "@/errors/AppError"
import connectMongoose from "@/lib/mongoose"
import { Types } from "mongoose"
import mongoose from "mongoose"

/** Non-commission ticket rows in invoice_items (see non-commission invoice create). */
export const NON_COMMISSION_TICKET_PRODUCT = "non_commission_ticket"

export async function getUniqueVendorInvoices(companyId: string) {
  await connectMongoose()

  const pipeline: any[] = [
    { $match: { vendorId: { $exists: true, $ne: null }, isDeleted: { $ne: true }, companyId: new Types.ObjectId(companyId) } }
  ]

  pipeline.push(
    { $group: { _id: "$invoiceId" } },
    {
      $lookup: {
        from: "invoices",
        let: { invId: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$_id", { $toObjectId: "$$invId" }] } } },
          { $project: { invoiceNo: 1 } }
        ],
        as: "invoice"
      }
    },
    { $unwind: "$invoice" },
    { $project: { _id: 0, id: "$_id", invoiceNo: "$invoice.invoiceNo" } },
    { $sort: { invoiceNo: -1 } }
  )

  const items = await InvoiceItem.aggregate(pipeline)
  return items
}

export async function getVendorSummaryByInvoice(invoiceId: string, companyId?: string) {
  await connectMongoose()

  const filter: Record<string, unknown> = {
    invoiceId,
    vendorId: { $exists: true, $ne: null },
    isDeleted: { $ne: true },
  }
  if (companyId && Types.ObjectId.isValid(companyId)) {
    filter.companyId = new Types.ObjectId(companyId)
  }

  const items = await InvoiceItem.find(filter)
    .populate("vendorId", "name email mobile")
    .lean()

  const vendorMap = new Map<
    string,
    {
      vendor: { id: string; name: string; mobile?: string; email?: string }
      totalCost: number
      paid: number
      due: number
    }
  >()

  for (const item of items) {
    const rawVid = item.vendorId as unknown
    if (rawVid == null) continue

    let vId: string
    let vName = ""
    let vMobile: string | undefined
    let vEmail: string | undefined

    if (typeof rawVid === "object" && rawVid !== null && "_id" in rawVid) {
      const p = rawVid as { _id: unknown; name?: string; mobile?: string; email?: string }
      vId = String(p._id)
      vName = p.name || ""
      vMobile = p.mobile
      vEmail = p.email
    } else {
      vId = String(rawVid)
    }

    if (!vendorMap.has(vId)) {
      vendorMap.set(vId, {
        vendor: { id: vId, name: vName, mobile: vMobile, email: vEmail },
        totalCost: 0,
        paid: 0,
        due: 0,
      })
    }
    const entry = vendorMap.get(vId)!
    const cost = Number(item.totalCost || 0)
    const paid = Number(item.paidAmount ?? 0)
    // Always derive line due from cost − paid. Stored dueAmount defaults to 0 in schema and is often stale.
    const lineDue = Math.max(0, cost - paid)

    entry.totalCost += cost
    entry.paid += paid
    entry.due += lineDue
  }

  return Array.from(vendorMap.values())
}

export type VendorPaymentLineSummary = {
  vendor: { id: string; name: string; mobile?: string; email?: string }
  totalCost: number
  paid: number
  due: number
  /** Real vendor (payment + balance). For ticket lines, vendor.id is invoiceItemId. */
  vendorId?: string
  invoiceItemId?: string
  invoiceId?: string
}

/** Vendors that have at least one payable non-commission ticket line. */
export async function getVendorsWithNonCommissionTickets(companyId: string) {
  await connectMongoose()
  if (!companyId || !Types.ObjectId.isValid(companyId)) return []

  const companyOid = new Types.ObjectId(companyId)
  const vendorIds = await InvoiceItem.distinct("vendorId", {
    companyId: companyOid,
    vendorId: { $exists: true, $ne: null },
    product: NON_COMMISSION_TICKET_PRODUCT,
    isDeleted: { $ne: true },
  })

  const ids = (vendorIds as unknown[]).filter((v) => v && Types.ObjectId.isValid(String(v))).map((v) => new Types.ObjectId(String(v)))

  if (!ids.length) return []

  const vendors = await Vendor.find({ _id: { $in: ids } })
    .select("name mobile email")
    .lean()

  return vendors.map((v: any) => ({
    id: String(v._id),
    name: v.name || "",
    mobile: v.mobile || "",
    email: v.email || "",
  }))
}

/** One summary row per ticket line; same totals shape as invoice-vendor summary + routing ids. */
export async function getNonCommissionTicketLinesByVendor(vendorId: string, companyId: string): Promise<VendorPaymentLineSummary[]> {
  await connectMongoose()
  if (!vendorId || !Types.ObjectId.isValid(vendorId)) return []
  if (!companyId || !Types.ObjectId.isValid(companyId)) return []
  const invFilters = {
    vendorId: new Types.ObjectId(vendorId),
    companyId: new Types.ObjectId(companyId),
    product: NON_COMMISSION_TICKET_PRODUCT,
    isDeleted: { $ne: true }
  }

  const items = await InvoiceItem.find(invFilters)
    .populate("vendorId", "name email mobile")
    .sort({ invoiceId: 1, _id: 1 })
    .lean()

  const { Invoice } = await import("@/models/invoice")
  const invIds = Array.from(new Set(items.map((i: any) => String(i.invoiceId))))
  const invoices =
    invIds.length > 0
      ? await Invoice.find({ _id: { $in: invIds.map((id) => new Types.ObjectId(id)) } })
        .select("invoiceNo")
        .lean()
      : []
  const invNoById = new Map<string, string>()
  for (const inv of invoices as any[]) {
    invNoById.set(String(inv._id), inv.invoiceNo || "")
  }

  const out: VendorPaymentLineSummary[] = []
  for (const item of items as any[]) {
    const rawVid = item.vendorId
    if (!rawVid) continue
    const realVendorId =
      typeof rawVid === "object" && rawVid !== null && "_id" in rawVid ? String(rawVid._id) : String(rawVid)
    const vName =
      typeof rawVid === "object" && rawVid !== null && "name" in rawVid ? String(rawVid.name || "") : ""
    const vMobile = typeof rawVid === "object" && rawVid?.mobile != null ? String(rawVid.mobile) : undefined
    const vEmail = typeof rawVid === "object" && rawVid?.email != null ? String(rawVid.email) : undefined

    const cost = Number(item.totalCost || 0)
    const paid = Number(item.paidAmount ?? 0)
    const due = Math.max(0, cost - paid)
    if (due <= 0) continue

    const invNo = invNoById.get(String(item.invoiceId)) || ""
    const ticketLabel = [invNo, item.description || item.paxName || "Ticket"].filter(Boolean).join(" · ")

    out.push({
      vendor: {
        id: String(item._id),
        name: ticketLabel || vName || "Ticket",
        mobile: vMobile,
        email: vEmail,
      },
      totalCost: cost,
      paid,
      due,
      vendorId: realVendorId,
      invoiceItemId: String(item._id),
      invoiceId: String(item.invoiceId),
    })
  }

  return out
}

// Generate next voucher number
async function getNextVoucherNo(companyId?: string) {
  const counter = await Counter.findOneAndUpdate(
    { key: "vendor_payment_voucher" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  )
  const seq = counter.seq.toString().padStart(4, "0")
  return `VP-${seq}`
}

/** Normalize subdoc / populated / string vendor refs for queries and updates. */
function coerceVendorObjectId(v: unknown): Types.ObjectId | null {
  if (v == null) return null
  if (v instanceof Types.ObjectId) return v
  if (typeof v === "string" && Types.ObjectId.isValid(v)) return new Types.ObjectId(v)
  if (typeof v === "object" && v !== null && "_id" in v) {
    const id = (v as { _id: unknown })._id
    if (id instanceof Types.ObjectId) return id
    if (typeof id === "string" && Types.ObjectId.isValid(id)) return new Types.ObjectId(id)
  }
  return null
}

export async function updateVendorBalance(vendorId: string | Types.ObjectId, amountChange: number, session: any) {
  const vendor = await Vendor.findById(vendorId).session(session)
  if (vendor) {
    let currentNet = 0
    if (vendor.presentBalance && typeof vendor.presentBalance === 'object') {
      const pType = vendor.presentBalance.type
      const pAmount = Number(vendor.presentBalance.amount || 0)
      currentNet = (pType === 'advance' ? pAmount : -pAmount)
    } else {
      currentNet = Number(vendor.presentBalance || 0)
    }

    // amountChange > 0 means payment (adding to balance), < 0 means reverting (subtracting)
    const newNet = currentNet + amountChange
    const newType = newNet >= 0 ? "advance" : "due"
    const newAmount = Math.abs(newNet)

    await Vendor.findByIdAndUpdate(vendorId, {
      presentBalance: { type: newType, amount: newAmount }
    }, { session })
  }
}

export async function createVendorPayment(data: any, companyId?: string) {
  await connectMongoose()
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const {
      invoiceId,
      invoiceVendors,
      paymentTo,
      paymentMethod,
      accountId,
      amount,
      vendorAit,
      totalAmount,
      receiptNo,
      referPassport,
      passportNo,
      date,
      note,
      voucher
    } = data

    if (paymentTo === "invoice" && (!invoiceVendors || !invoiceVendors.length)) {
      throw new AppError("No vendors selected for invoice payment", 400)
    }
    if (paymentTo === "ticket" && (!invoiceVendors || !invoiceVendors.length)) {
      throw new AppError("No ticket lines selected", 400)
    }

    const voucherNo = await getNextVoucherNo(companyId)

    // Sanitize ObjectIds
    let vendorId = data.vendorId ? new Types.ObjectId(data.vendorId) : undefined
    let invoiceIdObj = invoiceId ? new Types.ObjectId(invoiceId) : undefined
    const accountIdObj = accountId ? new Types.ObjectId(accountId) : undefined
    const companyIdObj = companyId ? new Types.ObjectId(companyId) : undefined

    if (paymentTo === "ticket") {
      if (!companyIdObj) throw new AppError("Company ID is required", 401)
      let firstInvoiceId: Types.ObjectId | undefined
      for (const row of invoiceVendors) {
        const payAmount = Number(row.amount)
        if (payAmount <= 0) continue
        const lineId = row.invoiceItemId
        if (!lineId || !Types.ObjectId.isValid(String(lineId))) {
          throw new AppError("Each row must select a ticket line", 400)
        }
        const vOid = coerceVendorObjectId(row.vendorId)
        if (!vOid) throw new AppError("Vendor is required for each ticket line", 400)
        const invItem = await InvoiceItem.findOne({
          _id: new Types.ObjectId(String(lineId)),
          vendorId: vOid,
          companyId: companyIdObj,
          product: NON_COMMISSION_TICKET_PRODUCT,
          isDeleted: { $ne: true },
        }).session(session)
        if (!invItem) throw new AppError("Invalid ticket line for this vendor", 400)
        const cost = Number(invItem.totalCost || 0)
        const paid = Number(invItem.paidAmount ?? 0)
        const due = Math.max(0, cost - paid)
        if (payAmount > due + 1e-9) throw new AppError("Amount exceeds due for a ticket line", 400)
        if (!firstInvoiceId) firstInvoiceId = new Types.ObjectId(String(invItem.invoiceId))
      }
      invoiceIdObj = firstInvoiceId
      if (!vendorId && invoiceVendors.length) {
        vendorId = new Types.ObjectId(String(invoiceVendors[0].vendorId))
      }
    }

    const paymentRecord = new VendorPayment({
      companyId: companyIdObj,
      invoiceId: invoiceIdObj,
      voucherNo,
      paymentTo,
      paymentMethod,
      accountId: accountIdObj,
      receiptNo,
      amount,
      vendorAit,
      totalAmount,
      paymentDate: date,
      note,
      referPassport,
      passportNo,
      vendorId,
      invoiceVendors: invoiceVendors?.map((v: any) => ({
        vendorId: new Types.ObjectId(v.vendorId),
        amount: Number(v.amount),
        ...(v.invoiceItemId && Types.ObjectId.isValid(String(v.invoiceItemId))
          ? { invoiceItemId: new Types.ObjectId(String(v.invoiceItemId)) }
          : {}),
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    await paymentRecord.save({ session })

    if (paymentTo === "invoice" && invoiceVendors?.length) {
      // Fetch all items once; filter per vendor in memory to avoid ObjectId type mismatches
      const allInvoiceItems = await InvoiceItem.find({ invoiceId: String(invoiceId) }).session(session)

      for (const row of invoiceVendors) {
        const payAmount = Number(row.amount)
        if (payAmount <= 0) continue
        const vendorOid = new Types.ObjectId(row.vendorId)

        const vendorItems = allInvoiceItems.filter(
          (i: any) =>
            String(i.vendorId) === String(vendorOid) ||
            (i.vendorId?._id && String(i.vendorId._id) === String(vendorOid))
        )

        let remaining = payAmount
        for (const invItem of vendorItems) {
          if (remaining <= 0) break
          const cost = Number(invItem.totalCost || 0)
          const paid = Number(invItem.paidAmount || 0)
          const due = cost - paid
          if (due <= 0) continue
          const allocation = Math.min(remaining, due)
          const newPaid = paid + allocation
          await InvoiceItem.findByIdAndUpdate(
            invItem._id,
            { $set: { paidAmount: newPaid, dueAmount: cost - newPaid } },
            { session }
          )
          remaining -= allocation
        }

        await updateVendorBalance(vendorOid, payAmount, session)
      }
    } else if (paymentTo === "ticket" && invoiceVendors?.length) {
      for (const row of invoiceVendors) {
        const payAmount = Number(row.amount)
        if (payAmount <= 0) continue
        const lineId = new Types.ObjectId(String(row.invoiceItemId))
        const vendorOid = new Types.ObjectId(row.vendorId)
        const invItem = await InvoiceItem.findById(lineId).session(session)
        if (!invItem) throw new AppError("Invoice line not found", 404)
        const cost = Number(invItem.totalCost || 0)
        const newPaid = Number(invItem.paidAmount ?? 0) + payAmount
        await InvoiceItem.findByIdAndUpdate(
          lineId,
          { $set: { paidAmount: newPaid, dueAmount: Math.max(0, cost - newPaid) } },
          { session }
        )
        await updateVendorBalance(vendorOid, payAmount, session)
      }
    } else if (["overall", "advance"].includes(paymentTo) && vendorId) {
      await updateVendorBalance(vendorId, Number(amount), session)
    }

    if (accountId) {
      const acc = await Account.findByIdAndUpdate(
        accountId,
        { $inc: { lastBalance: -Number(totalAmount) } },
        { session, new: true }
      )

      if (acc) {
        const transactionVendorId =
          vendorId ?? (invoiceVendors?.length ? new Types.ObjectId(invoiceVendors[0].vendorId) : undefined)

        await ClientTransaction.create(
          [{
            date,
            voucherNo,
            vendorId: transactionVendorId,
            companyId: companyId ? new Types.ObjectId(companyId) : undefined,
            invoiceType: "VENDOR_PAYMENT",
            paymentTypeId: new Types.ObjectId(accountId),
            accountName: acc.name,
            payType: paymentMethod,
            amount: totalAmount,
            direction: "payout",
            lastTotalAmount: acc.lastBalance,
            note: note || "Vendor Payment",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }],
          { session }
        )
      }
    }

    await session.commitTransaction()
    return paymentRecord
  } catch (error) {
    await session.abortTransaction()
    throw error
  } finally {
    session.endSession()
  }
}

export async function updateVendorPayment(id: string, data: any, companyId?: string) {
  await connectMongoose()
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const existing = await VendorPayment.findOne({ _id: id, companyId }).session(session)
    if (!existing) throw new AppError("Payment record not found", 404)

    // --- Reverse existing effects ---
    if (existing.paymentTo === "invoice" && existing.invoiceVendors?.length) {
      // Fetch all items for the invoice once; filter per vendor in memory to avoid ObjectId type mismatches
      const allInvoiceItems = await InvoiceItem.find({
        invoiceId: String(existing.invoiceId),
      }).session(session)

      for (const row of existing.invoiceVendors) {
        const revertAmount = Number(row.amount)
        const vendorOid = coerceVendorObjectId(row.vendorId)
        if (!vendorOid || revertAmount <= 0) continue

        await updateVendorBalance(vendorOid, -revertAmount, session)

        const vendorItems = allInvoiceItems
          .filter(
            (i: any) =>
              String(i.vendorId) === String(vendorOid) ||
              (i.vendorId?._id && String(i.vendorId._id) === String(vendorOid))
          )
          .sort((a: any, b: any) => (String(a._id) > String(b._id) ? 1 : -1))

        let remaining = revertAmount
        for (const invItem of vendorItems) {
          if (remaining <= 0) break
          const currentPaid = Number(invItem.paidAmount || 0)
          if (currentPaid <= 0) continue
          const revert = Math.min(remaining, currentPaid)
          const newPaid = currentPaid - revert
          await InvoiceItem.findByIdAndUpdate(
            invItem._id,
            { $set: { paidAmount: newPaid, dueAmount: Number(invItem.totalCost || 0) - newPaid } },
            { session }
          )
          remaining -= revert
        }
      }
    } else if (existing.paymentTo === "ticket" && existing.invoiceVendors?.length) {
      for (const row of existing.invoiceVendors) {
        const revertAmount = Number(row.amount)
        if (revertAmount <= 0) continue

        const vendorOid = coerceVendorObjectId(row.vendorId)
        const lineId = row.invoiceItemId

        if (vendorOid) {
          await updateVendorBalance(vendorOid, -revertAmount, session)
        }

        if (!lineId || !Types.ObjectId.isValid(String(lineId))) continue

        const invItem = await InvoiceItem.findById(lineId).session(session)
        if (!invItem) continue

        const cost = Number(invItem.totalCost || 0)
        const newPaid = Math.max(0, Number(invItem.paidAmount ?? 0) - revertAmount)
        await InvoiceItem.findByIdAndUpdate(
          lineId,
          { $set: { paidAmount: newPaid, dueAmount: Math.max(0, cost - newPaid) } },
          { session }
        )
      }
    } else if (["overall", "advance"].includes(String(existing.paymentTo || "")) && existing.vendorId) {
      const vOid = coerceVendorObjectId(existing.vendorId)
      if (vOid) {
        await updateVendorBalance(vOid, -Number(existing.amount || 0), session)
      }
    }

    // Revert account balance and ledger entry
    if (existing.accountId) {
      await Account.findByIdAndUpdate(
        existing.accountId,
        { $inc: { lastBalance: Number(existing.totalAmount) } },
        { session }
      )
      await ClientTransaction.deleteMany({ voucherNo: existing.voucherNo }).session(session)
    }

    const {
      invoiceId,
      invoiceVendors,
      paymentTo,
      paymentMethod,
      accountId,
      amount,
      vendorAit,
      totalAmount,
      receiptNo,
      referPassport,
      passportNo,
      date,
      note
    } = data

    existing.invoiceId = invoiceId ? new Types.ObjectId(invoiceId) : undefined
    existing.vendorId = data.vendorId ? new Types.ObjectId(data.vendorId) : undefined
    existing.paymentTo = paymentTo
    existing.paymentMethod = paymentMethod
    existing.accountId = accountId ? new Types.ObjectId(accountId) : undefined
    existing.receiptNo = receiptNo
    existing.amount = amount
    existing.vendorAit = vendorAit
    existing.totalAmount = totalAmount
    existing.paymentDate = date
    existing.note = note
    existing.referPassport = referPassport
    existing.passportNo = passportNo
    existing.invoiceVendors = invoiceVendors?.map((v: any) => ({
      vendorId: new Types.ObjectId(v.vendorId),
      amount: Number(v.amount),
      ...(v.invoiceItemId && Types.ObjectId.isValid(String(v.invoiceItemId))
        ? { invoiceItemId: new Types.ObjectId(String(v.invoiceItemId)) }
        : {}),
    }))
    existing.updatedAt = new Date().toISOString()

    await existing.save({ session })

    // --- Apply new effects ---
    if (paymentTo === "invoice" && invoiceVendors?.length) {
      const allInvoiceItems = await InvoiceItem.find({ invoiceId: String(invoiceId) }).session(session)

      for (const row of invoiceVendors) {
        const payAmount = Number(row.amount)
        if (payAmount <= 0) continue
        const vendorOid = new Types.ObjectId(row.vendorId)

        await updateVendorBalance(vendorOid, payAmount, session)

        const vendorItems = allInvoiceItems.filter(
          (i: any) =>
            String(i.vendorId) === String(vendorOid) ||
            (i.vendorId?._id && String(i.vendorId._id) === String(vendorOid))
        )

        let remaining = payAmount
        for (const invItem of vendorItems) {
          if (remaining <= 0) break
          const cost = Number(invItem.totalCost || 0)
          const paid = Number(invItem.paidAmount || 0)
          const due = cost - paid
          if (due <= 0) continue
          const allocation = Math.min(remaining, due)
          const newPaid = paid + allocation
          await InvoiceItem.findByIdAndUpdate(
            invItem._id,
            { $set: { paidAmount: newPaid, dueAmount: cost - newPaid } },
            { session }
          )
          remaining -= allocation
        }
      }
    } else if (paymentTo === "ticket" && invoiceVendors?.length) {
      for (const row of invoiceVendors) {
        const payAmount = Number(row.amount)
        if (payAmount <= 0) continue
        const lineId = new Types.ObjectId(String(row.invoiceItemId))
        const vendorOid = new Types.ObjectId(row.vendorId)
        const invItem = await InvoiceItem.findById(lineId).session(session)
        if (!invItem) throw new AppError("Invoice line not found", 404)
        const cost = Number(invItem.totalCost || 0)
        const newPaid = Number(invItem.paidAmount ?? 0) + payAmount
        await InvoiceItem.findByIdAndUpdate(
          lineId,
          { $set: { paidAmount: newPaid, dueAmount: Math.max(0, cost - newPaid) } },
          { session }
        )
        await updateVendorBalance(vendorOid, payAmount, session)
      }
    }

    if (accountId) {
      const acc = await Account.findByIdAndUpdate(
        accountId,
        { $inc: { lastBalance: -Number(totalAmount) } },
        { session, new: true }
      )

      if (acc) {
        const transactionVendorId =
          data.vendorId
            ? new Types.ObjectId(data.vendorId)
            : invoiceVendors?.length
              ? new Types.ObjectId(invoiceVendors[0].vendorId)
              : undefined

        await ClientTransaction.create(
          [{
            date,
            voucherNo: existing.voucherNo,
            vendorId: transactionVendorId,
            companyId: companyId ? new Types.ObjectId(companyId) : undefined,
            invoiceType: "VENDOR_PAYMENT",
            paymentTypeId: new Types.ObjectId(accountId),
            accountName: acc.name,
            payType: paymentMethod,
            amount: totalAmount,
            direction: "payout",
            lastTotalAmount: acc.lastBalance,
            note: note || "Vendor Payment Updated",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }],
          { session }
        )
      }
    }

    await session.commitTransaction()
    return existing
  } catch (error) {
    await session.abortTransaction()
    throw error
  } finally {
    session.endSession()
  }
}

export async function deleteVendorPayment(id: string, companyId?: string) {
  await connectMongoose()
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const existing = await VendorPayment.findOne({ _id: id, companyId }).session(session)
    if (!existing) throw new AppError("Payment record not found", 404)

    if (existing.paymentTo === "invoice" && existing.invoiceVendors?.length) {
      const allInvoiceItems = await InvoiceItem.find({
        invoiceId: String(existing.invoiceId),
      }).session(session)

      for (const row of existing.invoiceVendors) {
        const revertAmount = Number(row.amount)
        const vendorOid = coerceVendorObjectId(row.vendorId)
        if (!vendorOid || revertAmount <= 0) continue

        await updateVendorBalance(vendorOid, -revertAmount, session)

        const vendorItems = allInvoiceItems
          .filter(
            (i: any) =>
              String(i.vendorId) === String(vendorOid) ||
              (i.vendorId?._id && String(i.vendorId._id) === String(vendorOid))
          )
          .sort((a: any, b: any) => (String(a._id) > String(b._id) ? 1 : -1))

        let remaining = revertAmount
        for (const invItem of vendorItems) {
          if (remaining <= 0) break
          const currentPaid = Number(invItem.paidAmount || 0)
          if (currentPaid <= 0) continue
          const revert = Math.min(remaining, currentPaid)
          const newPaid = currentPaid - revert
          await InvoiceItem.findByIdAndUpdate(
            invItem._id,
            { $set: { paidAmount: newPaid, dueAmount: Number(invItem.totalCost || 0) - newPaid } },
            { session }
          )
          remaining -= revert
        }
      }
    } else if (existing.paymentTo === "ticket" && existing.invoiceVendors?.length) {
      for (const row of existing.invoiceVendors) {
        const revertAmount = Number(row.amount)
        if (revertAmount <= 0) continue

        const vendorOid = coerceVendorObjectId(row.vendorId)
        const lineId = row.invoiceItemId

        if (vendorOid) {
          await updateVendorBalance(vendorOid, -revertAmount, session)
        }

        if (!lineId || !Types.ObjectId.isValid(String(lineId))) continue

        const invItem = await InvoiceItem.findById(lineId).session(session)
        if (!invItem) continue

        const cost = Number(invItem.totalCost || 0)
        const newPaid = Math.max(0, Number(invItem.paidAmount ?? 0) - revertAmount)
        await InvoiceItem.findByIdAndUpdate(
          lineId,
          { $set: { paidAmount: newPaid, dueAmount: Math.max(0, cost - newPaid) } },
          { session }
        )
      }
    } else if (["overall", "advance"].includes(String(existing.paymentTo || "")) && existing.vendorId) {
      const vOid = coerceVendorObjectId(existing.vendorId)
      if (vOid) {
        await updateVendorBalance(vOid, -Number(existing.amount || 0), session)
      }
    }

    if (existing.accountId) {
      await Account.findByIdAndUpdate(
        existing.accountId,
        { $inc: { lastBalance: Number(existing.totalAmount) } },
        { session }
      )
      await ClientTransaction.deleteMany({ voucherNo: existing.voucherNo }).session(session)
    }

    await VendorPayment.deleteOne({ _id: id }).session(session)

    await session.commitTransaction()
    return { success: true }
  } catch (error) {
    await session.abortTransaction()
    throw error
  } finally {
    session.endSession()
  }
}

export async function getVendorPaymentById(id: string, companyId?: string) {
  await connectMongoose()

  const query: Record<string, unknown> = { _id: id }
  if (companyId && Types.ObjectId.isValid(companyId)) {
    query.companyId = new Types.ObjectId(companyId)
  }

  const payment = await VendorPayment.findOne(query)
    .populate("vendorId", "name mobile email")
    .populate("accountId", "name type")
    .populate("invoiceId", "invoiceNo salesDate")
    .populate("invoiceVendors.vendorId", "name")
    .populate("invoiceVendors.invoiceItemId", "product paxName description totalCost paidAmount dueAmount")
    .lean()

  if (!payment) return null

  const p = payment as any
  return {
    ...p,
    id: String(p._id),
    vendorId: String(p.vendorId?._id ?? p.vendorId ?? ""),
    vendorName: p.vendorId?.name || p.vendorName || "",
    accountName: p.accountId?.name || p.accountName || "",
    invoiceNo: p.invoiceId?.invoiceNo || "",
    invoiceSalesDate: p.invoiceId?.salesDate || "",
    invoiceVendors: (p.invoiceVendors ?? []).map((iv: any) => ({
      vendorId: typeof iv.vendorId === "object" ? String(iv.vendorId?._id) : String(iv.vendorId ?? ""),
      vendorName: iv.vendorId?.name || "",
      invoiceItemId: typeof iv.invoiceItemId === "object" ? String(iv.invoiceItemId?._id) : String(iv.invoiceItemId ?? ""),
      ticketLabel: [
        iv.invoiceItemId?.product,
        iv.invoiceItemId?.paxName || iv.invoiceItemId?.description,
      ].filter(Boolean).join(" · "),
      totalCost: Number(iv.invoiceItemId?.totalCost ?? 0),
      paid: Number(iv.invoiceItemId?.paidAmount ?? 0),
      due: Number(iv.invoiceItemId?.dueAmount ?? 0),
      amount: Number(iv.amount ?? 0),
    })),
  }
}

export async function listVendorPayments({ page = 1, pageSize = 20, search = "", startDate, endDate, companyId }: any) {
  await connectMongoose()
  const skip = (page - 1) * pageSize

  const query: any = {}
  if (companyId) query.companyId = companyId
  if (search) {
    query.$or = [
      { voucherNo: { $regex: search, $options: "i" } },
      { receiptNo: { $regex: search, $options: "i" } }
    ]
  }

  if (startDate || endDate) {
    query.paymentDate = {}
    if (startDate) query.paymentDate.$gte = startDate
    if (endDate) query.paymentDate.$lte = endDate
  }

  const [items, total] = await Promise.all([
    VendorPayment.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .populate("accountId", "name")
      .populate("invoiceVendors.vendorId", "name")
      .populate("invoiceId", "invoiceNo")
      .lean(),
    VendorPayment.countDocuments(query)
  ])

  return {
    items: items.map((i: any) => ({
      ...i,
      id: String(i._id),
      invoiceNo: i.invoiceId?.invoiceNo || "",
      vendorNames: i.invoiceVendors?.map((v: any) => v.vendorId?.name).join(", ") || "N/A"
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  }
}

// ---------------------------------------------------------------------------
// Vendor payment allocations (overall / advance → specific invoice items)
// ---------------------------------------------------------------------------

/**
 * Returns all invoices that contain at least one item for the given vendor,
 * along with that vendor's aggregated totalCost / paid / due per invoice.
 * Used to populate the allocation modal's invoice selector.
 */
export async function getInvoicesByVendor(vendorId: string, companyId: string) {
  await connectMongoose()
  if (!vendorId || !Types.ObjectId.isValid(vendorId)) return []
  if (!companyId || !Types.ObjectId.isValid(companyId)) return []

  const { Invoice } = await import("@/models/invoice")

  const items = await InvoiceItem.find({
    vendorId: new Types.ObjectId(vendorId),
    companyId: new Types.ObjectId(companyId),
    isDeleted: { $ne: true },
  })
    .select("invoiceId totalCost paidAmount")
    .lean()

  if (!items.length) return []

  // Aggregate per invoice
  const invMap = new Map<string, { totalCost: number; paid: number }>()
  for (const it of items as any[]) {
    const key = String(it.invoiceId)
    const entry = invMap.get(key) ?? { totalCost: 0, paid: 0 }
    entry.totalCost += Number(it.totalCost || 0)
    entry.paid += Number(it.paidAmount ?? 0)
    invMap.set(key, entry)
  }

  const invoiceDocs = await Invoice.find({
    _id: { $in: Array.from(invMap.keys()).map((id) => new Types.ObjectId(id)) },
  })
    .select("invoiceNo salesDate netTotal")
    .lean()

  return (invoiceDocs as any[]).map((inv) => {
    const agg = invMap.get(String(inv._id)) ?? { totalCost: 0, paid: 0 }
    const due = Math.max(0, agg.totalCost - agg.paid)
    return {
      id: String(inv._id),
      invoiceNo: inv.invoiceNo || "",
      salesDate: inv.salesDate || "",
      totalCost: agg.totalCost,
      paid: agg.paid,
      due,
    }
  })
}

/**
 * Creates allocation records linking an overall/advance vendor payment
 * to specific invoices and applies the amount to the invoice items for
 * that vendor (updates InvoiceItem.paidAmount / dueAmount).
 */
export async function createVendorPaymentAllocations(
  paymentId: string,
  allocations: Array<{ invoiceId: string; amount: number; paymentDate?: string }>,
  companyId: string
) {
  await connectMongoose()

  if (!paymentId || !Types.ObjectId.isValid(paymentId)) throw new AppError("Invalid paymentId", 400)
  if (!companyId || !Types.ObjectId.isValid(companyId)) throw new AppError("Company ID is required", 401)
  if (!Array.isArray(allocations) || !allocations.length) throw new AppError("No allocations provided", 400)

  const companyOid = new Types.ObjectId(companyId)
  const paymentOid = new Types.ObjectId(paymentId)

  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const payment = await VendorPayment.findOne({ _id: paymentOid, companyId: companyOid }).lean()
    if (!payment) throw new AppError("Payment not found", 404)

    const paymentRaw = payment as any
    if (!["overall", "advance"].includes(String(paymentRaw.paymentTo))) {
      throw new AppError("Allocations are only supported for overall and advance payments", 400)
    }

    const vendorOid = paymentRaw.vendorId
      ? new Types.ObjectId(String(paymentRaw.vendorId))
      : null
    if (!vendorOid) throw new AppError("Payment has no vendor", 400)

    // Compute remaining: total payment minus already-applied allocations
    const totalPaid = Math.max(0, Number(paymentRaw.amount || 0))
    const existingAllocs = await VendorPaymentAllocation.find({
      vendorPaymentId: paymentOid,
      companyId: companyOid,
    }).lean()
    const alreadyApplied = (existingAllocs as any[]).reduce(
      (s, a) => s + Math.max(0, Number(a.appliedAmount || 0)),
      0
    )
    const remaining = Math.max(0, totalPaid - alreadyApplied)

    const totalRequested = allocations.reduce((s, r) => s + Math.max(0, Number(r.amount || 0)), 0)
    if (totalRequested <= 0) throw new AppError("Allocation amount must be positive", 400)
    if (totalRequested > remaining + 1e-9) throw new AppError("Allocation exceeds remaining payment amount", 400)

    const now = new Date().toISOString()

    for (const row of allocations) {
      const amount = Math.max(0, Number(row.amount || 0))
      if (amount <= 0) continue

      const invIdStr = String(row.invoiceId || "").trim()
      if (!Types.ObjectId.isValid(invIdStr)) throw new AppError("Invalid invoiceId", 400)
      const invoiceOid = new Types.ObjectId(invIdStr)

      // Find all vendor items in this invoice and distribute the amount
      const vendorItems = await InvoiceItem.find({
        invoiceId: invoiceOid,
        vendorId: vendorOid,
        companyId: companyOid,
        isDeleted: { $ne: true },
      }).session(session)

      if (!vendorItems.length) throw new AppError("No vendor items found for this invoice", 400)

      const invoiceDue = vendorItems.reduce((s, it: any) => {
        return s + Math.max(0, Number(it.totalCost || 0) - Number(it.paidAmount ?? 0))
      }, 0)
      if (amount > invoiceDue + 1e-9) throw new AppError("Allocation exceeds invoice due for this vendor", 400)

      let remaining = amount
      for (const invItem of vendorItems as any[]) {
        if (remaining <= 0) break
        const cost = Number(invItem.totalCost || 0)
        const paid = Number(invItem.paidAmount ?? 0)
        const due = Math.max(0, cost - paid)
        if (due <= 0) continue
        const allocation = Math.min(remaining, due)
        const newPaid = paid + allocation
        await InvoiceItem.findByIdAndUpdate(
          invItem._id,
          { $set: { paidAmount: newPaid, dueAmount: Math.max(0, cost - newPaid) } },
          { session }
        )
        remaining -= allocation
      }

      // Create allocation record
      await new VendorPaymentAllocation({
        vendorPaymentId: paymentOid,
        vendorId: vendorOid,
        invoiceId: invoiceOid,
        companyId: companyOid,
        voucherNo: String(paymentRaw.voucherNo || ""),
        appliedAmount: amount,
        paymentDate: row.paymentDate || paymentRaw.paymentDate || now,
        createdAt: now,
        updatedAt: now,
      }).save({ session })
    }

    await session.commitTransaction()
    return { success: true }
  } catch (err) {
    await session.abortTransaction()
    throw err
  } finally {
    session.endSession()
  }
}

/** Returns all allocations for a vendor payment with invoice details. */
export async function listVendorPaymentAllocations(paymentId: string, companyId: string) {
  await connectMongoose()

  if (!paymentId || !Types.ObjectId.isValid(paymentId)) throw new AppError("Invalid paymentId", 400)
  if (!companyId || !Types.ObjectId.isValid(companyId)) throw new AppError("Company ID is required", 401)

  const companyOid = new Types.ObjectId(companyId)
  const paymentOid = new Types.ObjectId(paymentId)

  const { Invoice } = await import("@/models/invoice")

  const payment = await VendorPayment.findOne({ _id: paymentOid, companyId: companyOid }).lean()
  if (!payment) throw new AppError("Payment not found", 404)

  const rows = await VendorPaymentAllocation.find({
    vendorPaymentId: paymentOid,
    companyId: companyOid,
  })
    .sort({ paymentDate: 1, createdAt: 1 })
    .lean()

  const invIds = (rows as any[]).map((r) => r.invoiceId).filter(Boolean)
  const invoiceDocs = invIds.length
    ? await Invoice.find({ _id: { $in: invIds } }).select("invoiceNo salesDate netTotal").lean()
    : []
  const invMap = new Map<string, any>()
  for (const inv of invoiceDocs as any[]) invMap.set(String(inv._id), inv)

  const paymentRaw = payment as any
  const totalPaid = Math.max(0, Number(paymentRaw.amount || 0))
  const totalApplied = (rows as any[]).reduce((s, r) => s + Math.max(0, Number(r.appliedAmount || 0)), 0)
  const remainingAmount = Math.max(0, totalPaid - totalApplied)

  return {
    items: (rows as any[]).map((r) => {
      const inv = invMap.get(String(r.invoiceId))
      return {
        id: String(r._id),
        paymentDate: String(r.paymentDate || paymentRaw.paymentDate || r.createdAt || ""),
        invoiceNo: inv?.invoiceNo || "",
        salesDate: inv?.salesDate || "",
        paymentAmount: Number(r.appliedAmount || 0),
        invoiceAmount: Number(inv?.netTotal || 0),
      }
    }),
    remainingAmount,
    totalPaid,
  }
}

/** Reverses a single allocation — restores InvoiceItem.paidAmount and removes the record. */
export async function deleteVendorPaymentAllocation(
  paymentId: string,
  allocId: string,
  companyId: string
) {
  await connectMongoose()

  if (!paymentId || !Types.ObjectId.isValid(paymentId)) throw new AppError("Invalid paymentId", 400)
  if (!allocId || !Types.ObjectId.isValid(allocId)) throw new AppError("Invalid allocId", 400)
  if (!companyId || !Types.ObjectId.isValid(companyId)) throw new AppError("Company ID is required", 401)

  const companyOid = new Types.ObjectId(companyId)
  const paymentOid = new Types.ObjectId(paymentId)
  const allocOid = new Types.ObjectId(allocId)

  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const payment = await VendorPayment.findOne({ _id: paymentOid, companyId: companyOid }).lean()
    if (!payment) throw new AppError("Payment not found", 404)

    const alloc = await VendorPaymentAllocation.findOne({
      _id: allocOid,
      vendorPaymentId: paymentOid,
      companyId: companyOid,
    }).lean()
    if (!alloc) throw new AppError("Allocation not found", 404)

    const allocRaw = alloc as any
    const revertAmount = Math.max(0, Number(allocRaw.appliedAmount || 0))
    const vendorOid = allocRaw.vendorId
      ? new Types.ObjectId(String(allocRaw.vendorId))
      : (payment as any).vendorId
        ? new Types.ObjectId(String((payment as any).vendorId))
        : null

    // Reverse InvoiceItem paidAmount for all vendor items in this invoice
    if (allocRaw.invoiceId && vendorOid && revertAmount > 0) {
      const vendorItems = await InvoiceItem.find({
        invoiceId: allocRaw.invoiceId,
        vendorId: vendorOid,
        companyId: companyOid,
        isDeleted: { $ne: true },
      }).session(session)

      let remaining = revertAmount
      for (const invItem of vendorItems as any[]) {
        if (remaining <= 0) break
        const currentPaid = Number(invItem.paidAmount ?? 0)
        if (currentPaid <= 0) continue
        const revert = Math.min(remaining, currentPaid)
        const newPaid = currentPaid - revert
        await InvoiceItem.findByIdAndUpdate(
          invItem._id,
          { $set: { paidAmount: newPaid, dueAmount: Math.max(0, Number(invItem.totalCost || 0) - newPaid) } },
          { session }
        )
        remaining -= revert
      }
    }

    await VendorPaymentAllocation.deleteOne({ _id: allocOid, companyId: companyOid }, { session })

    await session.commitTransaction()
    return { success: true }
  } catch (err) {
    await session.abortTransaction()
    throw err
  } finally {
    session.endSession()
  }
}
