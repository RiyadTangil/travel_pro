import connectMongoose from "@/lib/mongoose"
import { AppError } from "@/errors/AppError"
import { Account } from "@/models/account"
import { Types } from "mongoose"
import { AccountType as AccountTypeModel } from "@/models/account-type"

type ListParams = { q?: string; page?: number; pageSize?: number }

export async function listAccounts(params: ListParams, companyId?: string) {
  await connectMongoose()
  const { q = "", page = 1, pageSize = 50 } = params || {}
  const filter: any = { }
  if (companyId && Types.ObjectId.isValid(String(companyId))) {
    filter.companyId = new Types.ObjectId(String(companyId))
  }
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { bankName: { $regex: q, $options: "i" } },
      { branch: { $regex: q, $options: "i" } },
      { accountNo: { $regex: q, $options: "i" } },
    ]
  }
  const total = await Account.countDocuments(filter)
  const items = await Account.find(filter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean()
  return {
    items: items.map((doc: any) => ({
      id: String(doc._id),
      name: doc.name,
      type: doc.type,
      accountTypeId: doc.accountTypeId ? String(doc.accountTypeId) : undefined,
      accountNo: doc.accountNo,
      bankName: doc.bankName,
      routingNo: doc.routingNo,
      cardNo: doc.cardNo,
      branch: doc.branch,
      lastBalance: typeof doc.lastBalance === 'number' ? doc.lastBalance : Number(doc.lastBalance || 0),
      hasTrxn: !!doc.hasTrxn,
    })),
    total,
    page,
    pageSize,
  }
}

type CreatePayload = {
  name: string
  type: string
  accountTypeId?: string
  accountNo?: string
  bankName?: string
  routingNo?: string
  cardNo?: string
  branch?: string
  lastBalance?: number
}

export async function createAccount(payload: CreatePayload, companyId?: string) {
  await connectMongoose()
  if (!payload?.name || !payload?.type) throw new AppError('Name and type are required', 400)
  if (!companyId || !Types.ObjectId.isValid(String(companyId))) throw new AppError('Company ID is required', 400)
  const now = new Date().toISOString()
  const doc: any = {
    name: payload.name,
    type: payload.type,
    accountNo: payload.accountNo || undefined,
    bankName: payload.bankName || undefined,
    routingNo: payload.routingNo || undefined,
    cardNo: payload.cardNo || undefined,
    branch: payload.branch || undefined,
    lastBalance: typeof payload.lastBalance === 'number' ? payload.lastBalance : Number(payload.lastBalance || 0),
    hasTrxn: false,
    companyId: new Types.ObjectId(String(companyId)),
    createdAt: now,
    updatedAt: now,
  }
  if (payload.accountTypeId && Types.ObjectId.isValid(String(payload.accountTypeId))) {
    doc.accountTypeId = new Types.ObjectId(String(payload.accountTypeId))
    if (!payload.type) {
      const at = await AccountTypeModel.findById(doc.accountTypeId).lean()
      doc.type = at?.name || "Cash"
    }
  }
  const res = await Account.create(doc)
  return { id: String(res._id) }
}

export async function getAllAccounts(companyId?: string) {
  await connectMongoose()
  const filter: any = {}
  if (companyId && Types.ObjectId.isValid(String(companyId))) {
    filter.companyId = new Types.ObjectId(String(companyId))
  }
  // Sort by Type first, then Name
  const items = await Account.find(filter).sort({ type: 1, name: 1 }).lean()
  return items.map((doc: any) => ({
      id: String(doc._id),
      name: doc.name,
      type: doc.type,
      accountTypeId: doc.accountTypeId ? String(doc.accountTypeId) : undefined,
      accountNo: doc.accountNo,
      bankName: doc.bankName,
      routingNo: doc.routingNo,
      cardNo: doc.cardNo,
      branch: doc.branch,
      lastBalance: typeof doc.lastBalance === 'number' ? doc.lastBalance : Number(doc.lastBalance || 0),
      hasTrxn: !!doc.hasTrxn,
  }))
}
