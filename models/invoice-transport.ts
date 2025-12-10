import { Schema, model, models } from "mongoose"

const InvoiceTransportSchema = new Schema({
  invoiceId: { type: String, index: true, required: true },
  // Frontend-aligned fields
  transportType: { type: String },
  referenceNo: { type: String },
  pickupPlace: { type: String },
  pickupTime: { type: String },
  dropOffPlace: { type: String },
  dropoffTime: { type: String },
  // Backward-compat fields
  transportTypeId: { type: String },
  pickupDate: { type: String },
  dropoffDate: { type: String },
  companyId: { type: String },
  id: { type: String },
  createdAt: { type: String },
  updatedAt: { type: String },
}, { collection: "invoice_transports" })

export const InvoiceTransport = models.InvoiceTransport || model("InvoiceTransport", InvoiceTransportSchema)
