import { isValidObjectId, Types } from "mongoose"
import connectMongoose from "@/lib/mongoose"
import { Client } from "@/models/client"

export async function listClients(params: { page?: number; limit?: number; search?: string; categoryId?: string; userId?: string; status?: string }) {
  await connectMongoose()
  const page = Math.max(1, Number(params.page) || 1)
  const limit = Math.max(1, Math.min(100, Number(params.limit) || 10))
  const filter: any = { isDeleted: { $ne: true } }
  const search = (params.search || "").trim()
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
    ]
  }
  if (params.categoryId) {
    filter.categoryId = isValidObjectId(params.categoryId) ? new Types.ObjectId(params.categoryId) : params.categoryId
  }
  if (params.userId) {
    filter["createdBy.id"] = isValidObjectId(params.userId) ? new Types.ObjectId(params.userId) : params.userId
  }
  if (params.status === "active") filter.active = true
  if (params.status === "inactive") filter.active = false

  const total = await Client.countDocuments(filter)
  const docs = await Client.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean()

  const clients = (docs || []).map((d: any) => ({ ...d, id: String(d._id) }))
  return { clients, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } }
}

export async function createClient(body: any) {
  await connectMongoose()
  const last = await Client.find({}).sort({ uniqueId: -1 }).limit(1).lean()
  const nextUniqueId = last.length > 0 && typeof last[0].uniqueId === "number" ? (last[0].uniqueId as number) + 1 : 1

  const now = new Date().toISOString()
  const openingBalanceType: string = body.openingBalanceType || ""
  const openingBalanceAmountNum = typeof body.openingBalanceAmount === "string"
    ? parseFloat(body.openingBalanceAmount || "0") || 0
    : (Number(body.openingBalanceAmount) || 0)
  const computedPresentBalance = openingBalanceType === "Due"
    ? -Math.abs(openingBalanceAmountNum)
    : openingBalanceType === "Advance"
      ? Math.abs(openingBalanceAmountNum)
      : 0

  const creditLimitNum = typeof body.creditLimit === "string"
    ? parseFloat(body.creditLimit || "0") || 0
    : Number(body.creditLimit) || 0
  console.log("body => ",body)
  const doc: any = {
    uniqueId: nextUniqueId,
    name: body.name,
    clientType: body.clientType,
    categoryId: isValidObjectId(body.categoryId) ? new Types.ObjectId(body.categoryId) : body.categoryId,
    email: body.email || "",
    phone: body.phone || "",
    address: body.address || "",
    gender: body.gender || "",
    source: body.source || "",
    designation: body.designation || "",
    tradeLicenseNo: body.tradeLicenseNo || "",
    openingBalanceType: openingBalanceType,
    openingBalanceAmount: openingBalanceAmountNum,
    creditLimit: creditLimitNum,
    presentBalance: typeof body.presentBalance === "number" ? body.presentBalance : computedPresentBalance,
    walkingCustomer: body.walkingCustomer || "No",
    active: true,
    createdAt: now,
    updatedAt: now,
  }
  console.log("doc => ",doc)

  const created = await Client.create(doc)
  const createdLean = created.toObject()
  return { client: { ...createdLean, id: String(createdLean._id) } }
}

export async function getClientById(id: string) {
  await connectMongoose()
  const doc = await Client.findById(id).lean()
  if (!doc) return null
  return { ...doc, id: String(doc._id) }
}

export async function updateClientById(id: string, body: any) {
  await connectMongoose()

  const update: any = { updatedAt: new Date().toISOString() }
  if (typeof body.name === "string") update.name = body.name
  if (typeof body.clientType === "string") update.clientType = body.clientType
  if (typeof body.categoryId === "string") update.categoryId = isValidObjectId(body.categoryId) ? new Types.ObjectId(body.categoryId) : body.categoryId
  if (typeof body.email === "string") update.email = body.email
  if (typeof body.phone === "string") update.phone = body.phone
  if (typeof body.address === "string") update.address = body.address
  if (typeof body.gender === "string") update.gender = body.gender
  if (typeof body.source === "string") update.source = body.source
  if (typeof body.designation === "string") update.designation = body.designation
  if (typeof body.tradeLicenseNo === "string") update.tradeLicenseNo = body.tradeLicenseNo
  // Opening balance fields are not editable once created
  // if (typeof body.openingBalanceType === "string") { /* ignore */ }
  // if (body.openingBalanceAmount != null) { /* ignore */ }
  if (typeof body.creditLimit !== "undefined") {
    update.creditLimit = typeof body.creditLimit === "string" ? (parseFloat(body.creditLimit || "0") || 0) : (Number(body.creditLimit) || 0)
  }
  if (typeof body.walkingCustomer === "string") update.walkingCustomer = body.walkingCustomer
  if (typeof body.active === "boolean") update.active = body.active

  const updated = await Client.findByIdAndUpdate(id, update, { new: true }).lean()
  if (!updated) return null
  return { ...updated, id: String(updated._id) }
}

export async function deleteClientById(id: string) {
  await connectMongoose()
  const deleted = await Client.findByIdAndDelete(id).lean()
  if (!deleted) return null
  return { ...deleted, id: String(deleted._id) }
}
