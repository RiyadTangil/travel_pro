import { Types } from "mongoose"
import mongoose from "mongoose"
import connectMongoose from "@/lib/mongoose"
import { Vendor } from "@/models/vendor"
import { createVendorOpeningBillAdjustment } from "@/services/billAdjustmentService"
import { AppError } from "@/errors/AppError"

export interface VendorQuery {
  page?: number
  pageSize?: number
  search?: string
  companyId: string
}

export async function getVendors(query: VendorQuery) {
  await connectMongoose()
  const { page = 1, pageSize = 20, search = "", companyId } = query
  const skip = (page - 1) * pageSize

  const filter: any = { companyId: new Types.ObjectId(companyId) }

  if (search) {
    const rx = { $regex: search, $options: "i" }
    filter.$or = [
      { name: rx },
      { mobile: rx },
      { email: rx },
    ]
  }

  const [total, docs] = await Promise.all([
    Vendor.countDocuments(filter),
    Vendor.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean()
  ])

  const data = docs.map((d: any) => ({
    id: String(d._id),
    name: d.name,
    email: d.email || "",
    mobilePrefix: d.mobilePrefix || "",
    mobile: d.mobile || "",
    registrationDate: d.registrationDate,
    openingBalanceType: d.openingBalanceType || undefined,
    openingBalance: d.openingBalance || 0,
    fixedAdvance: d.fixedAdvance || 0,
    address: d.address || "",
    creditLimit: d.creditLimit || 0,
    active: !!d.active,
    products: Array.isArray(d.products) ? d.products : [],
    presentBalance: d.presentBalance || { type: "due", amount: 0 },
    fixedBalance: d.fixedBalance || 0,
    companyId: d.companyId || null,
    createdBy: d.createdBy || undefined,
  }))

  return { data, total, page, pageSize }
}

export async function createVendor(body: any) {
  await connectMongoose()

  if (!body?.name || !String(body.name).trim()) {
    throw new AppError("Name is required", 400)
  }

  if (body.mobile && String(body.mobile).trim()) {
    const existingMobile = await Vendor.findOne({
      mobile: String(body.mobile).trim(),
      companyId: new Types.ObjectId(body.companyId),
    })
    if (existingMobile) {
      throw new AppError(`Vendor with mobile number ${body.mobile} already exists`, 400)
    }
  }

  const pb = body.presentBalance && typeof body.presentBalance === "object"
    ? body.presentBalance
    : { type: "due", amount: 0 }
    
  const fromPresentAmt = Math.abs(Number((pb as any).amount ?? 0))
  const fromOpeningField = Math.abs(Number(body.openingBalance ?? 0))
  const openingAmt = fromPresentAmt !== 0 ? fromPresentAmt : fromOpeningField
  const rawOpeningType = body.openingBalanceType ?? (pb as any).type ?? "due"
  const openingTypeNorm = String(rawOpeningType).toLowerCase() === "advance" ? "advance" : "due"

  const doc = {
    name: String(body.name).trim(),
    email: body.email || "",
    mobilePrefix: body.mobilePrefix || "",
    mobile: body.mobile || "",
    registrationDate: body.registrationDate ? new Date(body.registrationDate) : new Date(),
    openingBalanceType: body.openingBalanceType || rawOpeningType || undefined,
    openingBalance: Number(body.openingBalance || 0),
    fixedAdvance: Number(body.fixedAdvance || 0),
    address: body.address || "",
    creditLimit: Number(body.creditLimit || 0),
    active: body.active !== false,
    products: Array.isArray(body.products) ? body.products : [],
    presentBalance: openingAmt > 0
      ? { type: openingTypeNorm, amount: 0 }
      : (body.presentBalance || { type: "due", amount: 0 }),
    fixedBalance: Number(body.fixedBalance || 0),
    companyId: new Types.ObjectId(body.companyId),
    createdBy: body.createdBy || undefined,
  }

  const newVendor = new Vendor(doc)
  const result = await newVendor.save()

  const openingDateStr = doc.registrationDate.toISOString().slice(0, 10)

  if (openingAmt > 0 && result._id && doc.companyId) {
    const sess = await mongoose.startSession()
    sess.startTransaction()
    try {
      await createVendorOpeningBillAdjustment(sess, {
        vendorId: new Types.ObjectId(String(result._id)),
        companyId: String(doc.companyId),
        vendorName: doc.name,
        presentBalance: { type: openingTypeNorm, amount: openingAmt },
        date: openingDateStr,
      })
      await sess.commitTransaction()
    } catch (e) {
      await sess.abortTransaction()
      await Vendor.deleteOne({ _id: result._id })
      throw e
    } finally {
      sess.endSession()
    }
  }

  return { id: String(result._id) }
}