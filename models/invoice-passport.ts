import { Schema, model, models } from "mongoose"

const InvoicePassportSchema = new Schema({
  invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice", index: true, required: true },
  passportNo: { type: String },
  paxType: { type: String },
  name: { type: String },
  contactNo: { type: String },
  email: { type: String },
  dateOfBirth: { type: String },
  dateOfIssue: { type: String },
  dateOfExpire: { type: String },
  ticketId: { type: Schema.Types.ObjectId, ref: "InvoiceTicket", index: true }, 
  companyId: { type: Schema.Types.ObjectId, ref: "Company", index: true },
  isDeleted: { type: Boolean, default: false, index: true },
  createdAt: { type: String },
  updatedAt: { type: String },
}, { collection: "invoice_passports" })

export const InvoicePassport = models.InvoicePassport || model("InvoicePassport", InvoicePassportSchema)
