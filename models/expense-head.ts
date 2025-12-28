import { Schema, model, models, Types } from "mongoose"

const ExpenseHeadSchema = new Schema({
  name: { type: String, required: true, index: true },
  companyId: { type: Types.ObjectId, ref: "Company", index: true },
  createdAt: { type: String },
  updatedAt: { type: String },
}, { collection: "expense_heads" })

export const ExpenseHead = models.ExpenseHead || model("ExpenseHead", ExpenseHeadSchema)

