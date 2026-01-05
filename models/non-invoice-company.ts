import { Schema, model, models, Types } from "mongoose"

const NonInvoiceCompanySchema = new Schema({
  companyId: { type: Types.ObjectId, ref: "Company", required: true, index: true },
  name: { type: String, required: true },
  contactPerson: { type: String },
  designation: { type: String },
  phone: { type: String },
  address: { type: String },
  createdAt: { type: String },
  updatedAt: { type: String },
}, { collection: "non_invoice_companies" })

export const NonInvoiceCompany = models.NonInvoiceCompany || model("NonInvoiceCompany", NonInvoiceCompanySchema)
