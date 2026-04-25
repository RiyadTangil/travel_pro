import { Types } from "mongoose"
import connectMongoose from "@/lib/mongoose"
import { AccountType } from "@/models/account-type"
import { AppError } from "@/errors/AppError"

/** Global catalog — not scoped by company. */
export async function listAccountTypes(params?: { search?: string }) {
  await connectMongoose()
  const search = (params?.search || "").trim()
  const filter: Record<string, unknown> = {}
  if (search) filter.name = { $regex: search, $options: "i" }
  const docs = await AccountType.find(filter).sort({ name: 1 }).lean()
  return docs.map((d: any) => ({ id: String(d._id), name: d.name as string }))
}

export async function createAccountType(data: { name: string }) {
  await connectMongoose()
  const name = String(data.name || "").trim()
  if (!name) throw new AppError("Name is required", 400)
  const now = new Date().toISOString()
  const created = await AccountType.create({
    name,
    createdAt: now,
    updatedAt: now,
  } as any)
  return { id: String(created._id), name: created.name }
}

export async function updateAccountType(id: string, data: { name: string }) {
  await connectMongoose()
  if (!Types.ObjectId.isValid(id)) throw new AppError("Invalid ID", 400)
  const name = String(data.name || "").trim()
  if (!name) throw new AppError("Name is required", 400)
  const idObj = new Types.ObjectId(id)
  const existing = await AccountType.findById(idObj).lean()
  if (!existing) throw new AppError("Not found", 404)
  const now = new Date().toISOString()
  await AccountType.updateOne({ _id: idObj }, { $set: { name, updatedAt: now } })
  return { id, name }
}

export async function deleteAccountType(id: string) {
  await connectMongoose()
  if (!Types.ObjectId.isValid(id)) throw new AppError("Invalid ID", 400)
  const idObj = new Types.ObjectId(id)
  const res = await AccountType.deleteOne({ _id: idObj })
  if (!res.deletedCount) throw new AppError("Not found", 404)
  return { ok: true as const }
}
