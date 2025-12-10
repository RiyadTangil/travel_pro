import connectMongoose from "@/lib/mongoose"
import { ClientCategory } from "@/models/client-category"
import { isValidObjectId, Types } from "mongoose"

export async function listClientCategories(params: { page?: number; pageSize?: number; companyId?: string }) {
  await connectMongoose()
  const page = Math.max(1, Number(params.page) || 1)
  const pageSize = Math.max(1, Math.min(100, Number(params.pageSize) || 10))

  const filter: any = {}
  if (params.companyId) {
    const cid = String(params.companyId)
    filter.$or = [
      ...(isValidObjectId(cid) ? [{ companyId: new Types.ObjectId(cid) }] : []),
      { companyId: cid },
    ]
  }

  const total = await ClientCategory.countDocuments(filter)
  const docs = await ClientCategory.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .lean()

  const data = (docs || []).map((d: any) => ({ id: String(d._id), name: d.name, prefix: d.prefix }))
  return { data, total }
}

export async function createClientCategory(body: { name: string; prefix: string; status?: "active" | "inactive"; companyId?: string | null }) {
  await connectMongoose()
  const now = new Date().toISOString()
  const doc: any = {
    name: (body.name || "").trim(),
    prefix: (body.prefix || "").trim(),
    status: body.status || "active",
    companyId: body.companyId && isValidObjectId(String(body.companyId)) ? new Types.ObjectId(String(body.companyId)) : body.companyId || undefined,
    createdAt: now,
    updatedAt: now,
  }
  const created = await ClientCategory.create(doc)
  return { id: String(created._id), name: created.name, prefix: created.prefix }
}

export async function updateClientCategory(id: string, body: { name?: string; prefix?: string; status?: "active" | "inactive" }) {
  await connectMongoose()
  const update: any = { updatedAt: new Date().toISOString() }
  if (typeof body.name === "string") update.name = body.name.trim()
  if (typeof body.prefix === "string") update.prefix = body.prefix.trim()
  if (typeof body.status === "string") update.status = body.status
  const updated = await ClientCategory.findByIdAndUpdate(id, update, { new: true })
  if (!updated) return null
  return { id: String(updated._id), name: updated.name, prefix: updated.prefix }
}

