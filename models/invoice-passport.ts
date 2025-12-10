import { Schema, model, models } from "mongoose"

const InvoicePassportSchema = new Schema({
  invoiceId: { type: String, index: true, required: true },
  passportNo: { type: String },
  paxType: { type: String },
  name: { type: String },
  contactNo: { type: String },
  email: { type: String },
  dateOfBirth: { type: String },
  dateOfIssue: { type: String },
  dateOfExpire: { type: String },
  companyId: { type: String },
  passportId: { type: String },
  id: { type: String },
  createdAt: { type: String },
  updatedAt: { type: String },
}, { collection: "invoice_passports" })

export const InvoicePassport = models.InvoicePassport || model("InvoicePassport", InvoicePassportSchema)
