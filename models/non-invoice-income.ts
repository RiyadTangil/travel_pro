import { Schema, model, models, Types } from "mongoose"

const NonInvoiceIncomeSchema = new Schema({
  companyId: { type: Types.ObjectId, ref: "Company", required: true, index: true },
  nonInvoiceCompanyId: { type: Types.ObjectId, ref: "NonInvoiceCompany", required: true },
  nonInvoiceCompanyName: { type: String },
  voucherNo: { type: String, required: true, unique: true },
  date: { type: String, required: true },
  accountId: { type: Types.ObjectId, ref: "Account", required: true },
  accountName: { type: String },
  paymentMethod: { type: String },
  amount: { type: Number, required: true, min: 0 },
  note: { type: String },
  createdAt: { type: String },
  updatedAt: { type: String },
}, { collection: "non_invoice_incomes" })

export const NonInvoiceIncome = models.NonInvoiceIncome || model("NonInvoiceIncome", NonInvoiceIncomeSchema)
