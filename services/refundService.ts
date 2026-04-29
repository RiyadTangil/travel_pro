import mongoose, { Types } from "mongoose"
import connectMongoose from "@/lib/mongoose"
import { AppError } from "@/errors/AppError"
import { AirticketRefund } from "@/models/airticket-refund"
import { Invoice } from "@/models/invoice"
import { InvoiceItem } from "@/models/invoice-item"
import { InvoiceTicket } from "@/models/invoice-ticket"
import { Client } from "@/models/client"
import { Vendor } from "@/models/vendor"
import { ClientTransaction } from "@/models/client-transaction"
import { Account } from "@/models/account"
import { Counter } from "@/models/counter"
import { updateVendorBalance } from "@/services/vendorPaymentService"

function parseNumber(n: any, def = 0): number { 
  const x = Number(n); 
  return isFinite(x) ? x : def 
}

async function getNextRefundVoucherNo(companyId: string, session?: mongoose.ClientSession) {
  const cid = String(companyId || "").trim()
  if (!cid) throw new AppError("Company ID is required", 401)
  const key = `refund_voucher:${cid}`
  const opts: any = { new: true, upsert: true }
  if (session) opts.session = session
  const counter = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 }, $set: { updatedAt: new Date().toISOString() } },
    opts
  ).lean()
  const seqNum = (counter as any)?.seq ?? 1
  const seq = seqNum.toString().padStart(4, "0")
  return `RF-${seq}`
}

export async function getAirticketRefunds(companyId: string, query: any = {}) {
  await connectMongoose()
  if (!companyId) throw new AppError("Company ID is required", 401)
  const companyIdObj = new Types.ObjectId(companyId)

  const { page = 1, limit = 10, search = "", startDate, endDate } = query
  const skip = (Number(page) - 1) * Number(limit)

  const filter: any = { companyId: companyIdObj, isDeleted: { $ne: true } }
  
  if (search) {
    filter.$or = [
      { voucherNo: { $regex: search, $options: "i" } },
      { note: { $regex: search, $options: "i" } }
    ]
  }

  if (startDate && endDate) {
    filter.refundDate = { $gte: startDate, $lte: endDate }
  }

  const [items, total] = await Promise.all([
    AirticketRefund.find(filter)
      .populate("clientId", "name phone")
      .populate("vendorId", "name mobile")
      .populate("invoiceId", "invoiceNo")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    AirticketRefund.countDocuments(filter)
  ])

  return {
    items: items.map((it: any) => ({
      ...it,
      id: String(it._id),
      clientName: it.clientId?.name,
      vendorName: it.vendorId?.name,
      invoiceNo: it.invoiceId?.invoiceNo
    })),
    total,
    page: Number(page),
    limit: Number(limit)
  }
}

export async function createAirticketRefund(body: any, companyId: string) {
  await connectMongoose()
  if (!companyId) throw new AppError("Company ID is required", 401)
  const companyIdObj = new Types.ObjectId(companyId)
  const now = new Date().toISOString()

  const session = await mongoose.startSession()
  try {
    let result: any = null
    let resultOk = false
    await session.withTransaction(async () => {
      const voucherNo = await getNextRefundVoucherNo(companyId, session)
      
      const invoiceId = new Types.ObjectId(body.invoiceId)
      const clientId = new Types.ObjectId(body.clientId)
      const vendorId = body.vendorId ? new Types.ObjectId(body.vendorId) : undefined
      const ticketsToRefund = body.items || body.tickets || []

      // Get invoice to check type
      const invoice = await Invoice.findById(invoiceId).session(session).lean() as any
      if (!invoice) throw new AppError("Invoice not found", 404)
      const isNonCommission = invoice.invoiceType === "non_commission"

      // Validation for refund profit/charges
      const clientTotalCharge = parseNumber(body.clientTotalCharge, 0)
      const vendorTotalCharge = parseNumber(body.vendorTotalCharge, 0)
      const vendorTotalRefund = parseNumber(body.vendorTotalRefund, 0)

      if (vendorTotalCharge > vendorTotalRefund) {
        throw new AppError("Vendor charge cannot exceed vendor total refund amount", 400)
      }
      if (vendorTotalCharge > clientTotalCharge) {
        throw new AppError("Vendor charge cannot exceed client charge", 400)
      }

      const refundProfit = clientTotalCharge - vendorTotalCharge

      // 1. Mark individual InvoiceItems and InvoiceTickets as refunded
      if (ticketsToRefund.length > 0) {
        const ticketIds = ticketsToRefund.map((t: any) => new Types.ObjectId(t.ticketId))
        
        if (isNonCommission) {
          // For non-commission, ticketId passed from frontend is the InvoiceItem._id
          await InvoiceItem.updateMany(
            { _id: { $in: ticketIds }, companyId: companyIdObj },
            { $set: { isRefund: true, updatedAt: now } },
            { session }
          )
        } else {
          // For commission, ticketId is InvoiceTicket._id
          await Promise.all([
            InvoiceItem.updateMany(
              { referenceId: { $in: ticketIds }, companyId: companyIdObj },
              { $set: { isRefund: true, updatedAt: now } },
              { session }
            ),
            InvoiceTicket.updateMany(
              { _id: { $in: ticketIds }, companyId: companyIdObj },
              { $set: { isRefund: true, updatedAt: now } },
              { session }
            )
          ])
        }

        // Check if all tickets in the invoice are now refunded
        let totalTickets = 0
        let refundedTickets = 0

        if (isNonCommission) {
          [totalTickets, refundedTickets] = await Promise.all([
            InvoiceItem.countDocuments({ invoiceId, companyId: companyIdObj, isDeleted: { $ne: true } }).session(session),
            InvoiceItem.countDocuments({ invoiceId, companyId: companyIdObj, isRefund: true, isDeleted: { $ne: true } }).session(session)
          ])
        } else {
          [totalTickets, refundedTickets] = await Promise.all([
            InvoiceTicket.countDocuments({ invoiceId, companyId: companyIdObj, isDeleted: { $ne: true } }).session(session),
            InvoiceTicket.countDocuments({ invoiceId, companyId: companyIdObj, isRefund: true, isDeleted: { $ne: true } }).session(session)
          ])
        }

        if (totalTickets > 0 && totalTickets === refundedTickets) {
          await Invoice.updateOne(
            { _id: invoiceId, companyId: companyIdObj },
            { $set: { isRefund: true, updatedAt: now } },
            { session }
          )
        }
      }

      // 2. Create Refund Record
      const refundData = {
        ...body,
        tickets: ticketsToRefund, // Map items to tickets
        voucherNo,
        refundProfit,
        companyId: companyIdObj,
        invoiceId,
        clientId,
        vendorId,
        createdAt: now,
        updatedAt: now
      }
      const [createdRefund] = await AirticketRefund.create([refundData], { session })
      result = createdRefund

      // 3. Handle Client Balance Adjustment
      const clientReturnAmount = parseNumber(body.clientReturnAmount, 0)
      if (clientReturnAmount !== 0) {
        // Refund increases client balance (decreases due)
        await Client.updateOne(
          { _id: clientId, companyId: companyIdObj },
          { $inc: { presentBalance: clientReturnAmount }, $set: { updatedAt: now } },
          { session }
        )

        // Create Client Transaction
        const isMonetary = body.clientRefundType === "MONEY_RETURN"
        const clientNote = `Refund for Voucher: ${voucherNo}. Net total: ${parseNumber(body.clientTotalRefund, 0)}/- Charge: ${parseNumber(body.clientTotalCharge, 0)}/- Adjust: ${clientReturnAmount}/- ${body.note || ""}`
        
        const clientTx = new ClientTransaction({
          date: body.refundDate || now.slice(0, 10),
          voucherNo,
          clientId,
          companyId: companyIdObj,
          amount: clientReturnAmount,
          direction: "receiv", // Receiving back from system
          transactionType: "refund",
          isMonetoryTranseciton: isMonetary,
          paymentTypeId: isMonetary ? new Types.ObjectId(body.clientAccountId) : undefined,
          payType: isMonetary ? (body.clientPaymentMethod || "CASH") : "ADJUSTMENT",
          note: clientNote,
          createdAt: now,
          updatedAt: now,
        })
        await clientTx.save({ session })

        // Update Account Balance if Money Return
        if (isMonetary && body.clientAccountId) {
          await Account.updateOne(
            { _id: new Types.ObjectId(body.clientAccountId), companyId: companyIdObj },
            { $inc: { lastBalance: -clientReturnAmount }, $set: { updatedAt: now } }, // Money going OUT of account
            { session }
          )
        }
      }

      // 4. Handle Vendor Balance Adjustment
      const vendorReturnAmount = parseNumber(body.vendorReturnAmount, 0)
      if (vendorId && vendorReturnAmount !== 0) {
        // Refund increases vendor balance (decreases our due to them)
        await updateVendorBalance(vendorId, vendorReturnAmount, session)

        // Create Vendor Transaction
        const isMonetary = body.vendorRefundType === "MONEY_RETURN"
        const vendorNote = `Refund for Voucher: ${voucherNo}. Net total: ${parseNumber(body.vendorTotalRefund, 0)}/- Charge: ${parseNumber(body.vendorTotalCharge, 0)}/- Adjust: ${vendorReturnAmount}/- ${body.note || ""}`
        
        const vendorTx = new ClientTransaction({
          date: body.refundDate || now.slice(0, 10),
          voucherNo,
          vendorId,
          companyId: companyIdObj,
          amount: vendorReturnAmount,
          direction: "payout", // We are receiving money back from vendor (debit to reduce liability)
          transactionType: "refund",
          isMonetoryTranseciton: isMonetary,
          paymentTypeId: isMonetary ? new Types.ObjectId(body.vendorAccountId) : undefined,
          payType: isMonetary ? (body.vendorPaymentMethod || "CASH") : "ADJUSTMENT",
          note: vendorNote,
          createdAt: now,
          updatedAt: now,
        })
        await vendorTx.save({ session })

        // Update Account Balance if Money Return from Vendor
        if (isMonetary && body.vendorAccountId) {
          await Account.updateOne(
            { _id: new Types.ObjectId(body.vendorAccountId), companyId: companyIdObj },
            { $inc: { lastBalance: vendorReturnAmount }, $set: { updatedAt: now } }, // Money coming INTO account
            { session }
          )
        }
      }

      resultOk = true
    })
    return { ok: resultOk, refund: result }
  } catch (error) {
    console.error("createAirticketRefund error:", error)
    throw error
  } finally {
    session.endSession()
  }
}

export async function deleteAirticketRefund(id: string, companyId: string) {
  await connectMongoose()
  if (!companyId) throw new AppError("Company ID is required", 401)
  if (!Types.ObjectId.isValid(id)) throw new AppError("Invalid ID", 400)

  const companyIdObj = new Types.ObjectId(companyId)
  const session = await mongoose.startSession()
  const now = new Date().toISOString()

  try {
    let resultOk = false
    await session.withTransaction(async () => {
      const refund = await AirticketRefund.findOne({ _id: new Types.ObjectId(id), companyId: companyIdObj }).session(session)
      if (!refund) throw new AppError("Refund not found", 404)

      // 1. Revert Client Balance
      const clientReturnAmount = parseNumber(refund.clientReturnAmount, 0)
      if (refund.clientId && clientReturnAmount !== 0) {
        await Client.updateOne(
          { _id: refund.clientId, companyId: companyIdObj },
          { $inc: { presentBalance: -clientReturnAmount }, $set: { updatedAt: now } },
          { session }
        )

        // If it was MONEY_RETURN, revert Account balance
        if (refund.clientRefundType === "MONEY_RETURN" && refund.clientAccountId) {
          await Account.updateOne(
            { _id: refund.clientAccountId, companyId: companyIdObj },
            { $inc: { lastBalance: clientReturnAmount }, $set: { updatedAt: now } }, // Money coming BACK into account
            { session }
          )
        }
      }

      // 2. Revert Vendor Balance
      const vendorReturnAmount = parseNumber(refund.vendorReturnAmount, 0)
      if (refund.vendorId && vendorReturnAmount !== 0) {
        await updateVendorBalance(refund.vendorId, -vendorReturnAmount, session)

        // If it was MONEY_RETURN, revert Account balance
        if (refund.vendorRefundType === "MONEY_RETURN" && refund.vendorAccountId) {
          await Account.updateOne(
            { _id: refund.vendorAccountId, companyId: companyIdObj },
            { $inc: { lastBalance: -vendorReturnAmount }, $set: { updatedAt: now } }, // Money going OUT of account
            { session }
          )
        }
      }

      // 3. Delete Ledger Transactions
      await ClientTransaction.deleteMany({ voucherNo: refund.voucherNo, companyId: companyIdObj }, { session })

      // 4. Reset Invoice Refund Status
      await Invoice.updateOne(
        { _id: refund.invoiceId, companyId: companyIdObj },
        { $set: { isRefund: false, updatedAt: now } },
        { session }
      )

      // Get invoice to check type
      const invoice = await Invoice.findById(refund.invoiceId).session(session).lean() as any
      const isNonCommission = invoice?.invoiceType === "non_commission"

      // 4b. Reset Item/Ticket Refund Status
      if (refund.tickets && refund.tickets.length > 0) {
        const ticketIds = refund.tickets.map((t: any) => new Types.ObjectId(t.ticketId))
        
        if (isNonCommission) {
          await InvoiceItem.updateMany(
            { _id: { $in: ticketIds }, companyId: companyIdObj },
            { $set: { isRefund: false, updatedAt: now } },
            { session }
          )
        } else {
          await Promise.all([
            InvoiceItem.updateMany(
              { referenceId: { $in: ticketIds }, companyId: companyIdObj },
              { $set: { isRefund: false, updatedAt: now } },
              { session }
            ),
            InvoiceTicket.updateMany(
              { _id: { $in: ticketIds }, companyId: companyIdObj },
              { $set: { isRefund: false, updatedAt: now } },
              { session }
            )
          ])
        }
      }

      // 5. Soft Delete Refund Record
      await AirticketRefund.updateOne(
        { _id: refund._id },
        { $set: { isDeleted: true, updatedAt: now } },
        { session }
      )

      resultOk = true
    })
    return { ok: resultOk }
  } catch (error) {
    console.error("deleteAirticketRefund error:", error)
    throw error
  } finally {
    session.endSession()
  }
}
