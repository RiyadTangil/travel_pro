import { Schema, model, models, Types } from "mongoose"

const ClientTransactionSchema = new Schema({
  date: { type: String, required: true },
  voucherNo: { type: String, required: true, index: true }, // MR-xxx / EX-xxx
  clientId: { type: Types.ObjectId, ref: "Client", index: true, required: false },
  vendorId: { type: Types.ObjectId, ref: "Vendor", index: true, required: false },
  clientName: { type: String },
  companyId: { type: Types.ObjectId, ref: "Company", index: true },
  invoiceType: { type: String }, // matches dropdown values
  paymentTypeId: { type: Types.ObjectId, ref: "Account" }, // account id
  accountName: { type: String },
  payType: { type: String }, // e.g. CASH / BANK / MOBILE
  amount: { type: Number, required: true },
  direction: { type: String, enum: ["receiv", "payout"], required: true },
  lastTotalAmount: { type: Number, default: 0 },
  note: { type: String },
  createdAt: { type: String },
  updatedAt: { type: String },
}, { collection: "client_transactions" })

export const ClientTransaction = models.ClientTransaction || model("ClientTransaction", ClientTransactionSchema)
