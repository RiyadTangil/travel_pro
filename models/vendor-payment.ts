import { Schema, model, models, Types } from "mongoose"

const VendorPaymentSchema = new Schema({
  vendorId: { type: Types.ObjectId, ref: "Vendor", index: true },
  vendorName: { type: String },
  companyId: { type: Types.ObjectId, ref: "Company", index: true },
  invoiceId: { type: Types.ObjectId, ref: "Invoice", index: true },
  voucherNo: { type: String, index: true, required: true }, // e.g., VP-xxxx
  paymentTo: { type: String, enum: ["overall", "advance", "invoice", "adjust"], required: true },
  paymentMethod: { type: String }, // e.g., Cash, Bank, Mobile banking, Credit Card
  accountId: { type: Types.ObjectId, ref: "Account" },
  accountName: { type: String },
  receiptNo: { type: String }, // manual receipt no
  amount: { type: Number, required: true },
  vendorAit: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  paymentDate: { type: String }, // ISO YYYY-MM-DD
  note: { type: String },
  voucherImage: { type: String },
  referPassport: { type: String, enum: ["yes", "no"], default: "no" },
  passportNo: { type: String },
  
  // Specific invoice details (when paymentTo is "invoice")
  invoiceVendors: [{
    vendorId: { type: Types.ObjectId, ref: "Vendor" },
    amount: { type: Number }
  }],

  createdAt: { type: String },
  updatedAt: { type: String },
}, { collection: "vendor_payments" })

export const VendorPayment = models.VendorPayment || model("VendorPayment", VendorPaymentSchema)
