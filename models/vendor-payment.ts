import { Schema, model, models, Types } from "mongoose"

const VendorPaymentSchema = new Schema({
  vendorId: { type: Types.ObjectId, ref: "Vendor", index: true },
  vendorName: { type: String },
  companyId: { type: Types.ObjectId, ref: "Company", index: true },
  invoiceId: { type: Types.ObjectId, ref: "Invoice", index: true },
  voucherNo: { type: String, index: true, required: true }, // e.g., VP-xxxx
  paymentTo: { type: String, enum: ["overall", "advance", "invoice", "ticket"], required: true },
  paymentMethod: { type: String }, // e.g., Cash, Bank, Mobile banking, Credit Card
  accountId: { type: Types.ObjectId, ref: "Account" },
  accountName: { type: String },
  receiptNo: { type: String }, // manual receipt no
  amount: { type: Number, required: true },
  vendorAit: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  paymentDate: { type: Date }, // ISO YYYY-MM-DD
  note: { type: String },
  voucherImage: { type: String },
  referPassport: { type: String, enum: ["yes", "no"], default: "no" },
  passportNo: { type: String },
  
  // Specific invoice / specific ticket line allocations
  invoiceVendors: [{
    vendorId: { type: Types.ObjectId, ref: "Vendor" },
    /** Set when paymentTo is "ticket" (per Non-Commissi  on Ticket line) */
    invoiceItemId: { type: Types.ObjectId, ref: "InvoiceItem" },
    amount: { type: Number }
  }],

  createdAt: { type: String },
  updatedAt: { type: String },
}, { collection: "vendor_payments" })

// Compound index for unique voucher numbers within a company
VendorPaymentSchema.index({ companyId: 1, voucherNo: 1 }, { unique: true })

export const VendorPayment = models.VendorPayment || model("VendorPayment", VendorPaymentSchema)
