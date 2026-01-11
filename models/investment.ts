import { Schema, model, models, Types } from "mongoose"

const InvestmentSchema = new Schema({
  voucherNo: { type: String, required: true },
  companyId: { type: Types.ObjectId, ref: "Company", index: true },
  targetCompanyId: { type: Types.ObjectId, ref: "NonInvoiceCompany", required: true },
  targetCompanyName: { type: String },
  accountId: { type: Types.ObjectId, ref: "Account", required: true },
  accountName: { type: String },
  paymentMethod: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: String, required: true },
  note: { type: String },
  createdAt: { type: String },
  updatedAt: { type: String },
}, { collection: "investments" })

export const Investment = models.Investment || model("Investment", InvestmentSchema)
