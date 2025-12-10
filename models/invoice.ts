import { Schema, model, models, Types } from "mongoose"

const BillingSummarySchema = new Schema({
  subtotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  serviceCharge: { type: Number, default: 0 },
  vatTax: { type: Number, default: 0 },
  netTotal: { type: Number, default: 0 },
  note: { type: String, default: "" },
  reference: { type: String, default: "" },
}, { _id: false })

const InvoiceSchema = new Schema({
  invoiceNo: { type: String, required: true, index: true, unique: true },
  clientId: { type: Types.ObjectId, ref: "Client", index: true },
  employeeId: { type: Types.ObjectId, ref: "Employee", index: true },
  agentId: { type: Types.ObjectId, ref: "Agent", index: true },
  companyId: { type: Types.ObjectId, ref: "Company", index: true },
  salesDate: { type: String },
  dueDate: { type: String },
  clientName: { type: String },
  clientPhone: { type: String },
  salesByName: { type: String },
  agentName: { type: String },
  billing: { type: BillingSummarySchema, default: () => ({}) },
  showPrevDue: { type: Boolean, default: false },
  showDiscount: { type: Boolean, default: false },
  agentCommission: { type: Number, default: 0 },
  clientPreviousDue: { type: Number, default: 0 },
  netTotal: { type: Number, default: 0 },
  receivedAmount: { type: Number, default: 0 },
  status: { type: String, default: "due" },
  createdAt: { type: String },
  updatedAt: { type: String },
}, { collection: "invoices" })

export const Invoice = models.Invoice || model("Invoice", InvoiceSchema)
export type InvoiceDoc = InstanceType<typeof Invoice>
