import { Schema, model, models, Types } from "mongoose"

const MoneyReceiptSchema = new Schema({
  clientId: { type: Types.ObjectId, ref: "Client", index: true, required: true },
  clientName: { type: String },
  companyId: { type: Types.ObjectId, ref: "Company", index: true },
  invoiceId: { type: Types.ObjectId, ref: "Invoice", index: true },
  voucherNo: { type: String, index: true, required: true }, // e.g., MR-0047
  paymentTo: { type: String, enum: ["overall", "advance", "invoice", "tickets", "adjust"], required: true },
  paymentMethod: { type: String }, // e.g., Cash, Bank, Mobile banking, Credit Card
  accountId: { type: Types.ObjectId, ref: "Account" },
  accountName: { type: String },
  manualReceiptNo: { type: String },
  amount: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  paymentDate: { type: String }, // ISO YYYY-MM-DD
  note: { type: String },
  docOneName: { type: String },
  docTwoName: { type: String },
  chequeStatus: { type: String },
  createdAt: { type: String },
  updatedAt: { type: String },
}, { collection: "money_receipts" })

export const MoneyReceipt = models.MoneyReceipt || model("MoneyReceipt", MoneyReceiptSchema)
