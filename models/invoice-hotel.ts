import { Schema, model, models } from "mongoose"

const InvoiceHotelSchema = new Schema({
  invoiceId: { type: String, index: true, required: true },
  // Frontend-aligned fields
  hotelName: { type: String },
  referenceNo: { type: String },
  checkInDate: { type: String },
  checkOutDate: { type: String },
  roomType: { type: String },
  // Backward-compat fields
  checkIn: { type: String },
  checkOut: { type: String },
  nights: { type: Number },
  companyId: { type: String },
  id: { type: String },
  isDeleted: { type: Boolean, default: false, index: true },
  createdAt: { type: String },
  updatedAt: { type: String },
}, { collection: "invoice_hotels" })

export const InvoiceHotel = models.InvoiceHotel || model("InvoiceHotel", InvoiceHotelSchema)
