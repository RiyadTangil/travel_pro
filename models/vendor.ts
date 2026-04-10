import { Schema, model, models, Types } from "mongoose"

const VendorSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String },
  mobile: { type: String },
  companyId: { type: Types.ObjectId, ref: "Company", index: true, required: true },
  presentBalance: {
    type: { type: String, enum: ["due", "advance"], default: "due" },
    amount: { type: Number, default: 0 }
  },
  createdAt: { type: String },
  updatedAt: { type: String },
}, { collection: "vendors", strict: false })

// Prevent model caching during development
if (process.env.NODE_ENV === "development" && models.Vendor) {
  delete models.Vendor
}

export const Vendor = models.Vendor || model("Vendor", VendorSchema)
