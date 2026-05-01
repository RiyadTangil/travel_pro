import { Schema, model, models, Types } from "mongoose"

const VendorSchema = new Schema({
  name: { type: String, required: true, index: true },
  email: { type: String },
  mobilePrefix: { type: String },
  mobile: { type: String, index: true },
  registrationDate: { type: Date },
  openingBalanceType: { type: String, enum: ["due", "advance", ""], default: "due" },
  openingBalance: { type: Number, default: 0 },
  fixedAdvance: { type: Number, default: 0 },
  address: { type: String },
  creditLimit: { type: Number, default: 0 },
  active: { type: Boolean, default: true, index: true },
  products: { type: [String], default: [] },
  presentBalance: {
    type: { type: String, enum: ["due", "advance"], default: "due" },
    amount: { type: Number, default: 0 },
  },
  fixedBalance: { type: Number, default: 0 },
  // Relations
  companyId: { type: Types.ObjectId, ref: "Company", index: true, required: true },
  createdBy: {
    id: { type: Types.ObjectId, ref: "User" },
    name: { type: String },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { collection: "vendors" })

// Compound index to ensure mobile is unique per company (if provided)
VendorSchema.index({ mobile: 1, companyId: 1 }, { 
  unique: true, 
  partialFilterExpression: { mobile: { $type: "string", $gt: "" } } 
})

export const Vendor = models.Vendor || model("Vendor", VendorSchema)
