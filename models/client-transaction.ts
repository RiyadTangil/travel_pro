import { Schema, model, models, Types } from "mongoose"

const ClientTransactionSchema = new Schema({
  date: { type: String, required: true },
  voucherNo: { type: String, required: true, index: true }, // MR-xxx / EX-xxx
  clientId: { type: Types.ObjectId, ref: "Client", index: true, required: true },
  clientName: { type: String },
  companyId: { type: Types.ObjectId, ref: "Company", index: true },
  invoiceType: { type: String }, // matches dropdown values
  paymentTypeId: { type: Types.ObjectId, ref: "Account" }, // account id
  accountName: { type: String },
  payType: { type: String }, // e.g. CASH / BANK / MOBILE
  amount: { type: Number, required: true },
  direction: { type: String, enum: ["receive", "expense"], required: true },
  relatedInvoiceId: { type: Types.ObjectId, ref: "Invoice" },
  note: { type: String },
  createdAt: { type: String },
  updatedAt: { type: String },
}, { collection: "client_transactions" })

export const ClientTransaction = models.ClientTransaction || model("ClientTransaction", ClientTransactionSchema)
