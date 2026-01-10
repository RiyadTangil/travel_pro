import { Schema, model, models, Types } from "mongoose"

const AccountSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  accountTypeId: { type: Types.ObjectId, ref: "AccountType", index: true, required: true },
  accountNo: { type: String },
  bankName: { type: String },
  routingNo: { type: String },
  cardNo: { type: String },
  branch: { type: String },
  lastBalance: { type: Number, default: 0 },
  hasTrxn: { type: Boolean, default: false },
  companyId: { type: Types.ObjectId, ref: "Company", index: true },
  createdAt: { type: String },
  updatedAt: { type: String },
}, { collection: "accounts" })

// Middleware to automatically update hasTrxn when lastBalance changes
AccountSchema.pre("save", async function(this: any) {
  if (this.isModified("lastBalance")) {
    this.hasTrxn = true
  }
})

AccountSchema.pre(["findOneAndUpdate", "updateOne", "updateMany"], async function(this: any) {
  const update = this.getUpdate() as any
  if (update) {
    // Check if lastBalance is being modified via $inc or $set
    const isBalanceUpdate = 
      (update.$inc && update.$inc.lastBalance !== undefined) ||
      (update.$set && update.$set.lastBalance !== undefined) ||
      (update.lastBalance !== undefined)

    if (isBalanceUpdate) {
      if (!update.$set) update.$set = {}
      update.$set.hasTrxn = true
    }
  }
})

// Prevent model caching during development to ensure middleware is applied
if (process.env.NODE_ENV === "development" && models.Account) {
  delete models.Account
}

export const Account = models.Account || model("Account", AccountSchema)
