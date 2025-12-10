import { Schema, model, models } from "mongoose"

const InvoiceTicketSchema = new Schema({
  invoiceId: { type: String, index: true, required: true },
  // Frontend-aligned fields
  ticketNo: { type: String },
  pnr: { type: String },
  route: { type: String },
  referenceNo: { type: String },
  journeyDate: { type: String },
  returnDate: { type: String },
  airline: { type: String },
  // Backward-compat fields (older data)
  airlineId: { type: String },
  passengerName: { type: String },
  fromAirport: { type: String },
  toAirport: { type: String },
  flightDate: { type: String },
  companyId: { type: String },
  id: { type: String },
  createdAt: { type: String },
  updatedAt: { type: String },
}, { collection: "invoice_tickets" })

export const InvoiceTicket = models.InvoiceTicket || model("InvoiceTicket", InvoiceTicketSchema)
