import { Schema, model, models, Types } from "mongoose"

const ExpenseItemSchema = new Schema({
  headId: { type: Types.ObjectId, ref: "ExpenseHead", required: true },
  headName: { type: String }, // cached name
  amount: { type: Number, required: true, min: 0 }
})

const ExpenseSchema = new Schema({
  companyId: { type: Types.ObjectId, ref: "Company", index: true, required: true },
  voucherNo: { type: String, required: true, index: true },
  date: { type: Date, required: true },
  
  accountId: { type: Types.ObjectId, ref: "Account", required: true },
  accountName: { type: String },
  paymentMethod: { type: String },
  
  totalAmount: { type: Number, required: true, min: 0 },
  items: [ExpenseItemSchema],
  
  note: { type: String },
  
  // File attachments (images)
  voucherImage1: { type: String },
  voucherImage2: { type: String },

  createdAt: { type: String },
  updatedAt: { type: String },
}, { collection: "expenses" })

// Compound index for unique voucher numbers within a company
ExpenseSchema.index({ companyId: 1, voucherNo: 1 }, { unique: true })

export const Expense = models.Expense || model("Expense", ExpenseSchema)
