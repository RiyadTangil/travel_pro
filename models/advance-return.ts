import { Schema, model, models, Types } from "mongoose"

const AdvanceReturnSchema = new Schema({
  clientId: { type: Types.ObjectId, ref: "Client", index: true, required: true },
  clientName: { type: String },
  companyId: { type: Types.ObjectId, ref: "Company", index: true },
  voucherNo: { type: String, index: true, required: true },
  paymentMethod: { type: String },
  accountId: { type: Types.ObjectId, ref: "Account" },
  accountName: { type: String },
  advanceAmount: { type: Number, required: true },
  returnDate: { type: String },
  note: { type: String },
  receiptNo: { type: String },
  transactionCharge: { type: Number, default: 0 },
  createdAt: { type: String },
  updatedAt: { type: String },
}, { collection: "advance_returns" })

export const AdvanceReturn = models.AdvanceReturn || model("AdvanceReturn", AdvanceReturnSchema)
