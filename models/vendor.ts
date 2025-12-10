import { Schema, model, models } from "mongoose"

const VendorSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String },
  mobile: { type: String },
  companyId: { type: String },
  createdAt: { type: String },
  updatedAt: { type: String },
}, { collection: "vendors" })

export const Vendor = models.Vendor || model("Vendor", VendorSchema)
