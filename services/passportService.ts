import connectMongoose from "@/lib/mongoose"
import { PassportModel } from "@/models/passport"
import { AppError } from "@/errors/AppError"

export interface PassportListParams {
  page?: number
  limit?: number
  search?: string
  status?: string
  clientId?: string
  startDate?: string
  endDate?: string
  companyId?: string
}

export interface PassportInput {
  clientId?: string
  passportNo: string
  paxType?: string
  name: string
  mobile: string
  email?: string
  nid?: string
  dob?: string
  dateOfIssue?: string
  dateOfExpire?: string
  note?: string
}

function toResponseDoc(d: any) {
  return { ...d, id: String(d._id) }
}

export async function listPassports(params: PassportListParams) {
  await connectMongoose()

  const {
    page = 1,
    limit = 20,
    search = "",
    status = "",
    clientId = "",
    startDate,
    endDate,
    companyId,
  } = params

  const filter: Record<string, any> = {}
  if (companyId) filter.companyId = companyId
  if (search) {
    filter.$or = [
      { passportNo: { $regex: search, $options: "i" } },
      { name:       { $regex: search, $options: "i" } },
      { mobile:     { $regex: search, $options: "i" } },
      { email:      { $regex: search, $options: "i" } },
    ]
  }
  if (status && status !== "All") filter.status = status
  if (clientId) filter.clientId = clientId
  if (startDate || endDate) {
    filter.createdAt = {}
    if (startDate) filter.createdAt.$gte = new Date(startDate)
    if (endDate)   filter.createdAt.$lte = new Date(endDate)
  }

  const skip  = (page - 1) * limit
  const total = await PassportModel.countDocuments(filter)
  const docs  = await PassportModel.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean()

  return {
    passports: (docs as any[]).map(toResponseDoc),
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  }
}

export async function createPassports(items: PassportInput[], companyId: string) {
  await connectMongoose()
  if (!companyId) throw new AppError("Company ID required", 401)
  if (!items.length) throw new AppError("No passport data provided", 400)

  for (const item of items) {
    if (!item.passportNo || !item.name || !item.mobile) {
      throw new AppError("passportNo, name and mobile are required", 400)
    }
  }

  const now = new Date()
  const docs = items.map((item) => ({
    clientId:     item.clientId || null,
    passportNo:   item.passportNo,
    paxType:      item.paxType || "",
    name:         item.name,
    mobile:       item.mobile,
    email:        item.email || "",
    nid:          item.nid || "",
    dob:          item.dob || "",
    dateOfIssue:  item.dateOfIssue || "",
    dateOfExpire: item.dateOfExpire || "",
    note:         item.note || "",
    status:       "PENDING",
    companyId,
    createdAt:    now,
    updatedAt:    now,
  }))

  const result = await PassportModel.insertMany(docs)
  return (result as any[]).map((r) => toResponseDoc(r.toObject ? r.toObject() : r))
}

export async function getPassportById(id: string, companyId?: string) {
  await connectMongoose()
  const query: Record<string, any> = { _id: id }
  if (companyId) query.companyId = companyId
  const doc = await PassportModel.findOne(query).lean()
  if (!doc) throw new AppError("Passport not found", 404)
  return toResponseDoc(doc as any)
}

export async function updatePassport(id: string, updates: Record<string, any>, companyId?: string) {
  await connectMongoose()
  const query: Record<string, any> = { _id: id }
  if (companyId) query.companyId = companyId
  delete updates.companyId
  updates.updatedAt = new Date()
  const result = await PassportModel.updateOne(query, { $set: updates })
  if (result.matchedCount === 0) throw new AppError("Passport not found or access denied", 404)
  return { ok: true }
}

export async function deletePassport(id: string, companyId?: string) {
  await connectMongoose()
  const query: Record<string, any> = { _id: id }
  if (companyId) query.companyId = companyId
  const result = await PassportModel.deleteOne(query)
  if (result.deletedCount === 0) throw new AppError("Passport not found or access denied", 404)
  return { ok: true }
}
