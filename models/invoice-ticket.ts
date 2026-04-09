import { Schema, model, models } from "mongoose"

const InvoiceTicketSchema = new Schema({
  invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice", index: true, required: true },
  // Frontend-aligned fields
  ticketNo: { type: String },
  pnr: { type: String },
  route: { type: String },
  referenceNo: { type: String },
  journeyDate: { type: String },
  returnDate: { type: String },
  airline: { type: String },
  gdsPnr: { type: String },
  ticketType: { type: String },
  airbusClass: { type: String },
  issueDate: { type: String },
  // Backward-compat fields (older data)
  airlineId: { type: String },
  passengerName: { type: String },
  fromAirport: { type: String },
  toAirport: { type: String },
  flightDate: { type: String },
  companyId: { type: Schema.Types.ObjectId, ref: "Company", index: true },
  isDeleted: { type: Boolean, default: false, index: true },
  createdAt: { type: String },
  updatedAt: { type: String },
}, { collection: "invoice_tickets" })

export const InvoiceTicket = models.InvoiceTicket || model("InvoiceTicket", InvoiceTicketSchema)
