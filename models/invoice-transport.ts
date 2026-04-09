import { Schema, model, models } from "mongoose"

const InvoiceTransportSchema = new Schema({
  invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice", index: true, required: true },
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
  ticketId: { type: Schema.Types.ObjectId, ref: "InvoiceTicket", index: true }, 
  companyId: { type: Schema.Types.ObjectId, ref: "Company", index: true },
  isDeleted: { type: Boolean, default: false, index: true },
  createdAt: { type: String },
  updatedAt: { type: String },
}, { collection: "invoice_transports" })

export const InvoiceTransport = models.InvoiceTransport || model("InvoiceTransport", InvoiceTransportSchema)
