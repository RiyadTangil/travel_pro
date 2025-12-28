import { Schema, model, models, Types } from "mongoose"

const AccountTypeSchema = new Schema({
  name: { type: String, required: true },
  companyId: { type: Types.ObjectId, ref: "Company", index: true },
  createdAt: { type: String },
  updatedAt: { type: String },
}, { collection: "account_types" })

export const AccountType = models.AccountType || model("AccountType", AccountTypeSchema)
