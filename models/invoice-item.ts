import { Schema, model, models } from "mongoose"

const InvoiceItemSchema = new Schema({
  invoiceId: { type: String, index: true, required: true }, // stored as String in existing data
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
  companyId: { type: String },
  id: { type: String },
  createdAt: { type: String },
  updatedAt: { type: String },
}, { collection: "invoice_items" })

export const InvoiceItem = models.InvoiceItem || model("InvoiceItem", InvoiceItemSchema)
