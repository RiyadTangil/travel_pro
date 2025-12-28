import { Schema, model, models, Types } from "mongoose"

const MoneyReceiptAllocationSchema = new Schema({
  moneyReceiptId: { type: Types.ObjectId, ref: "MoneyReceipt", index: true, required: true },
  invoiceId: { type: Types.ObjectId, ref: "Invoice", index: true, required: true },
  clientId: { type: Types.ObjectId, ref: "Client", index: true, required: true },
  companyId: { type: Types.ObjectId, ref: "Company", index: true },
  voucherNo: { type: String, index: true },
  appliedAmount: { type: Number, required: true },
  paymentDate: { type: String },
  createdAt: { type: String },
  updatedAt: { type: String },
}, { collection: "money_receipt_allocations" })

MoneyReceiptAllocationSchema.index({ moneyReceiptId: 1, invoiceId: 1 }, { unique: false })

export const MoneyReceiptAllocation = models.MoneyReceiptAllocation || model("MoneyReceiptAllocation", MoneyReceiptAllocationSchema)
