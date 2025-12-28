import { Types } from "mongoose"
import connectMongoose from "@/lib/mongoose"
import { ExpenseHead } from "@/models/expense-head"
import { AppError } from "@/errors/AppError"

export async function listExpenseHeads(params: { page?: number; pageSize?: number; search?: string; companyId?: string }) {
  await connectMongoose()
  const { page = 1, pageSize = 50, search = "", companyId } = params || {}
  const filter: any = {}
  if (search) filter.name = { $regex: String(search).trim(), $options: "i" }
  if (companyId) {
    const cid = String(companyId)
    filter.$or = [
      ...(Types.ObjectId.isValid(cid) ? [{ companyId: new Types.ObjectId(cid) }] as any[] : []),
      { companyId: cid },
    ]
  }
  const total = await ExpenseHead.countDocuments(filter)
  const docs = await ExpenseHead.find(filter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean()
  const items = docs.map((d: any) => ({ id: String(d._id), name: d.name, createdAt: d.createdAt || new Date().toISOString() }))
  return { items, pagination: { page, pageSize, total } }
}

export async function createExpenseHead(body: any, companyId?: string) {
  await connectMongoose()
  const now = new Date().toISOString()
  const name = String(body.name || "").trim()
  if (!name) throw new AppError("Name is required", 400)
  const doc: any = {
    name,
    companyId: companyId && Types.ObjectId.isValid(String(companyId)) ? new Types.ObjectId(String(companyId)) : (companyId || undefined),
    createdAt: now,
    updatedAt: now,
  }
  const created = await ExpenseHead.create(doc as any)
  return { id: String(created._id), name: created.name, createdAt: created.createdAt }
}

export async function updateExpenseHead(id: string, body: any, companyId?: string) {
  await connectMongoose()
  const now = new Date().toISOString()
  const idObj = new Types.ObjectId(String(id))
  const existing = await ExpenseHead.findById(idObj).lean()
  if (!existing) throw new AppError("Not found", 404)
  if (companyId && String(existing.companyId || "") !== String(companyId)) throw new AppError("Not found", 404)
  const name = String(body.name || "").trim()
  if (!name) throw new AppError("Name is required", 400)
  await ExpenseHead.updateOne({ _id: idObj }, { $set: { name, updatedAt: now } })
  return { id: String(idObj), name, updatedAt: now }
}

export async function deleteExpenseHead(id: string, companyId?: string) {
  await connectMongoose()
  const idObj = new Types.ObjectId(String(id))
  const existing = await ExpenseHead.findById(idObj).lean()
  if (!existing) throw new AppError("Not found", 404)
  if (companyId && String(existing.companyId || "") !== String(companyId)) throw new AppError("Not found", 404)
  await ExpenseHead.deleteOne({ _id: idObj })
  return { deleted_id: String(idObj) }
}

