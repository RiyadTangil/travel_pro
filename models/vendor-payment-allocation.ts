import { Schema, model, models, Types } from "mongoose"

/**
 * Tracks how an "overall" or "advance" vendor payment is allocated
 * to specific invoice items (vendor cost lines). Mirrors the client-side
 * MoneyReceiptAllocation pattern.
 */
const VendorPaymentAllocationSchema = new Schema({
  vendorPaymentId: { type: Types.ObjectId, ref: "VendorPayment", index: true, required: true },
  vendorId:        { type: Types.ObjectId, ref: "Vendor",        index: true, required: true },
  invoiceId:       { type: Types.ObjectId, ref: "Invoice",       index: true, required: true },
  companyId:       { type: Types.ObjectId, ref: "Company",       index: true, required: true },
  voucherNo:       { type: String, index: true },
  appliedAmount:   { type: Number, required: true },
  paymentDate:     { type: String },
  createdAt:       { type: String },
  updatedAt:       { type: String },
}, { collection: "vendor_payment_allocations" })

VendorPaymentAllocationSchema.index({ vendorPaymentId: 1, invoiceId: 1 })

export const VendorPaymentAllocation =
  models.VendorPaymentAllocation ||
  model("VendorPaymentAllocation", VendorPaymentAllocationSchema)
