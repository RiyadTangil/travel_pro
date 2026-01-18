import { Schema, model, models } from "mongoose"

const VendorAdvanceReturnSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, required: true },
  vendorId: { type: Schema.Types.ObjectId, required: true, ref: "Vendor" },
  voucherNo: { type: String },
  returnDate: { type: String, required: true },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, default: "Cash" },
  accountId: { type: Schema.Types.ObjectId, ref: "Account" },
  accountName: { type: String },
  note: { type: String },
  createdAt: { type: String },
  updatedAt: { type: String }
}, { collection: "vendor_advance_returns" })

if (process.env.NODE_ENV === "development" && models.VendorAdvanceReturn) {
  delete models.VendorAdvanceReturn
}

export const VendorAdvanceReturn = models.VendorAdvanceReturn || model("VendorAdvanceReturn", VendorAdvanceReturnSchema)
