import { Schema, model, models, Types } from "mongoose"

const BalanceTransferSchema = new Schema({
  companyId: { type: Types.ObjectId, ref: "Company", required: true, index: true },
  voucherNo: { type: String, required: true },
  date: { type: String, required: true },
  transferFromId: { type: Types.ObjectId, ref: "Account", required: true },
  transferToId: { type: Types.ObjectId, ref: "Account", required: true },
  amount: { type: Number, required: true, min: 0 },
  transferCharge: { type: Number, default: 0 },
  note: { type: String },
  createdAt: { type: String },
  updatedAt: { type: String },
}, { collection: "account_balance_transfers" })

export const BalanceTransfer = models.AccountBalanceTransfer || model("AccountBalanceTransfer", BalanceTransferSchema)
