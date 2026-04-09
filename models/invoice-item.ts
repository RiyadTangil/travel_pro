import { Schema, model, models } from "mongoose"

const InvoiceItemSchema = new Schema({
  invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice", index: true, required: true },
  itemType: { type: String, enum: ['product', 'ticket', 'visa', 'hotel', 'transport'], default: 'product' },
  product: { type: String },
  paxName: { type: String },
  description: { type: String },
  quantity: { type: Number, default: 1 },
  unitPrice: { type: Number, default: 0 },
  costPrice: { type: Number, default: 0 },
  totalSales: { type: Number, default: 0 },
  totalCost: { type: Number, default: 0 },
  profit: { type: Number, default: 0 },
  vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", index: true },
  
  // Visa specific fields (Flattened for performance/simplicity as per payload)
  country: { type: String },
  visaType: { type: String },
  visaDuration: { type: String },
  token: { type: String },
  delivery: { type: String },
  visaNo: { type: String },
  mofaNo: { type: String },
  okalaNo: { type: String },

  // Relation links
  referenceId: { type: Schema.Types.ObjectId, index: true }, // Links to Ticket/Passport/Hotel/Transport doc
  
  companyId: { type: Schema.Types.ObjectId, ref: "Company", index: true },
  isDeleted: { type: Boolean, default: false, index: true },
  createdAt: { type: String },
  updatedAt: { type: String },
}, { collection: "invoice_items" })

// Prevent model caching during development
if (process.env.NODE_ENV === "development" && models.InvoiceItem) {
  delete models.InvoiceItem
}

export const InvoiceItem = models.InvoiceItem || model("InvoiceItem", InvoiceItemSchema)
