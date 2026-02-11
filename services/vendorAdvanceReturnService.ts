import { Types } from "mongoose"
import connectMongoose from "@/lib/mongoose"
import mongoose from "mongoose"
import { VendorAdvanceReturn } from "@/models/vendor-advance-return"
import { Vendor } from "@/models/vendor"
import { Account } from "@/models/account"
import { ClientTransaction } from "@/models/client-transaction"
import { Counter } from "@/models/counter"
import { AppError } from "@/errors/AppError"

async function getNextVoucherNo() {
  const counter = await Counter.findOneAndUpdate(
    { key: "vendor_advance_return_voucher" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  )
  const seq = counter.seq.toString().padStart(4, "0")
  return `ADVR-${seq}` // Using same prefix as client? Or VADVR? User screenshot shows ADVR. Let's stick to ADVR but maybe prefix clash if same counter key? 
  // User screenshot shows ADVR-9967001. 
  // If we use same key as client advance return, we might want to check.
  // But let's use a unique key for safety: "vendor_advance_return_voucher".
}

async function updateVendorBalance(vendorId: string | Types.ObjectId, amountChange: number, session: any) {
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

    const newNet = currentNet + amountChange
    const newType = newNet >= 0 ? "advance" : "due"
    const newAmount = Math.abs(newNet)

    await Vendor.findByIdAndUpdate(vendorId, { 
      presentBalance: { type: newType, amount: newAmount } 
    }, { session })
  }
}

export async function createVendorAdvanceReturn(data: any) {
  await connectMongoose()
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const {
      companyId,
      vendorId,
      returnDate,
      amount,
      paymentMethod,
      accountId,
      accountName,
      note
    } = data

    if (!companyId) throw new AppError("Company ID is required", 400)
    if (!vendorId) throw new AppError("Vendor is required", 400)
    if (!accountId) throw new AppError("Account is required", 400)

    const voucherNo = await getNextVoucherNo()

    const newReturn = new VendorAdvanceReturn({
      companyId: new Types.ObjectId(companyId),
      vendorId: new Types.ObjectId(vendorId),
      voucherNo,
      returnDate,
      amount,
      paymentMethod,
      accountId: new Types.ObjectId(accountId),
      accountName,
      note,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    await newReturn.save({ session })

    // 1. Update Vendor Balance (Decrease Advance => Negative Change)
    await updateVendorBalance(vendorId, -amount, session)

    // 2. Update Account Balance (Increase => Money In)
    await Account.findByIdAndUpdate(accountId, {
      $inc: { lastBalance: amount }
    }, { session })

    // 3. Create Transaction Record
    await ClientTransaction.create([{
      companyId: new Types.ObjectId(companyId),
      date: returnDate,
      voucherNo,
      clientId: undefined, 
      vendorId: new Types.ObjectId(vendorId), // Storing vendorId
      accountName,
      paymentTypeId: new Types.ObjectId(accountId),
      payType: paymentMethod,
      amount,
      direction: "receiv", // Money In
      invoiceType: "VENDOR_ADVANCE_RETURN",
      note: note || "Vendor Advance Return",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }], { session })

    await session.commitTransaction()
    return newReturn
  } catch (error) {
    await session.abortTransaction()
    throw error
  } finally {
    session.endSession()
  }
}

export async function updateVendorAdvanceReturn(id: string, data: any) {
  await connectMongoose()
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const existing = await VendorAdvanceReturn.findById(id).session(session)
    if (!existing) throw new AppError("Record not found", 404)

    // Revert Old Impact
    // Vendor: Old Amount was subtracted. Now Add it back.
    await updateVendorBalance(existing.vendorId, existing.amount, session)
    // Account: Old Amount was added. Now Subtract it.
    await Account.findByIdAndUpdate(existing.accountId, {
      $inc: { lastBalance: -existing.amount }
    }, { session })
    // Transaction: Delete old
    await ClientTransaction.deleteMany({ voucherNo: existing.voucherNo, invoiceType: "VENDOR_ADVANCE_RETURN" }, { session })

    // Apply New Data
    const merged = { ...existing.toObject(), ...data }
    const {
      companyId,
      vendorId,
      returnDate,
      amount,
      paymentMethod,
      accountId,
      accountName,
      note
    } = merged

    // Update Doc
    await VendorAdvanceReturn.findByIdAndUpdate(id, {
      ...data,
      updatedAt: new Date().toISOString()
    }, { session })

    // Apply New Impact
    // Vendor: Subtract new amount
    await updateVendorBalance(vendorId, -amount, session)
    // Account: Add new amount
    await Account.findByIdAndUpdate(accountId, {
      $inc: { lastBalance: amount }
    }, { session })
    // Transaction: Create new
    await ClientTransaction.create([{
      companyId: new Types.ObjectId(companyId),
      date: returnDate,
      voucherNo: existing.voucherNo, // Keep original voucher
      vendorId: new Types.ObjectId(vendorId), // Storing vendorId
      accountName,
      paymentTypeId: new Types.ObjectId(accountId),
      payType: paymentMethod,
      amount,
      direction: "receiv",
      invoiceType: "VENDOR_ADVANCE_RETURN",
      note: note || "Vendor Advance Return",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }], { session })

    await session.commitTransaction()
    return { ok: true }
  } catch (error) {
    await session.abortTransaction()
    throw error
  } finally {
    session.endSession()
  }
}

export async function deleteVendorAdvanceReturn(id: string) {
  await connectMongoose()
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const existing = await VendorAdvanceReturn.findById(id).session(session)
    if (!existing) throw new AppError("Record not found", 404)

    // Revert Impact
    // Vendor: Add back amount
    await updateVendorBalance(existing.vendorId, existing.amount, session)
    // Account: Subtract amount
    await Account.findByIdAndUpdate(existing.accountId, {
      $inc: { lastBalance: -existing.amount }
    }, { session })
    // Transaction: Delete
    await ClientTransaction.deleteMany({ voucherNo: existing.voucherNo, invoiceType: "VENDOR_ADVANCE_RETURN" }, { session })

    await VendorAdvanceReturn.findByIdAndDelete(id, { session })

    await session.commitTransaction()
    return { ok: true }
  } catch (error) {
    await session.abortTransaction()
    throw error
  } finally {
    session.endSession()
  }
}

export async function listVendorAdvanceReturns(params: any) {
  await connectMongoose()
  const { page = 1, pageSize = 20, search = "", dateFrom, dateTo, companyId } = params

  const filter: any = {}
  if (companyId) filter.companyId = new Types.ObjectId(companyId)
  if (dateFrom || dateTo) {
    filter.returnDate = {}
    if (dateFrom) filter.returnDate.$gte = dateFrom
    if (dateTo) filter.returnDate.$lte = dateTo
  }

  // Basic search on voucherNo or note
  if (search) {
    filter.$or = [
      { voucherNo: { $regex: search, $options: "i" } },
      { note: { $regex: search, $options: "i" } }
    ]
  }

  const skip = (page - 1) * pageSize
  const total = await VendorAdvanceReturn.countDocuments(filter)
  
  const docs = await VendorAdvanceReturn.find(filter)
    .populate("vendorId", "name")
    .sort({ returnDate: -1, createdAt: -1 })
    .skip(skip)
    .limit(pageSize)
    .lean()

  const items = docs.map((d: any) => ({
    id: String(d._id),
    returnDate: d.returnDate,
    voucherNo: d.voucherNo,
    vendorName: d.vendorId?.name || "Unknown",
    vendorId: String(d.vendorId?._id || d.vendorId),
    paymentType: d.paymentMethod,
    paymentDetails: d.accountName, // Or accountId if needed
    accountId: String(d.accountId),
    advanceAmount: d.amount,
    returnNote: d.note
  }))

  return {
    items,
    pagination: {
      page,
      pageSize,
      total
    }
  }
}
