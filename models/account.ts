import { Schema, model, models, Types } from "mongoose"

const AccountSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ["Cash", "Bank", "Mobile banking", "Credit Card"], required: true },
  accountNo: { type: String },
  bankName: { type: String },
  routingNo: { type: String },
  cardNo: { type: String },
  branch: { type: String },
  lastBalance: { type: Number, default: 0 },
  hasTrxn: { type: Boolean, default: false },
  companyId: { type: Types.ObjectId, ref: "Company", index: true },
  createdAt: { type: String },
  updatedAt: { type: String },
}, { collection: "accounts" })

export const Account = models.Account || model("Account", AccountSchema)

