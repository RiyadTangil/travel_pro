import { Schema, model, models, Types } from "mongoose"

const BillAdjustmentSchema = new Schema({
  date: { type: String, required: true },
  voucherNo: { type: String, required: true, unique: true },
  type: { type: String, enum: ["Account", "Client", "Vendor", "Combined"], required: true },
  name: { type: String, required: true },
  accountId: { type: Types.ObjectId, ref: "Account" },
  clientId: { type: Types.ObjectId, ref: "Client" },
  vendorId: { type: Types.ObjectId, ref: "Vendor" },
  paymentMethod: { type: String },
  transactionType: { type: String, enum: ["DEBIT", "CREDIT"], required: true },
  amount: { type: Number, required: true },
  note: { type: String },
  companyId: { type: Types.ObjectId, ref: "Company", required: true },
  createdAt: { type: String },
  updatedAt: { type: String },
}, { collection: "bill_adjustments" })

export const BillAdjustment = models.BillAdjustment || model("BillAdjustment", BillAdjustmentSchema)
