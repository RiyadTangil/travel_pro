import { Schema, model, models, Types } from "mongoose"

const ClientSchema = new Schema({
  uniqueId: { type: Number, index: true },
  name: { type: String, required: true },
  clientType: { type: String, enum: ["Individual", "Corporate"], default: "Individual" },
  categoryId: { type: Types.ObjectId, ref: "Category", index: true },
  email: { type: String },
  phone: { type: String },
  address: { type: String },
  gender: { type: String },
  source: { type: String },
  designation: { type: String },
  tradeLicenseNo: { type: String },
  openingBalanceType: { type: String, enum: ["", "Due", "Advance"], default: "" },
  openingBalanceAmount: { type: Number, default: 0 },
  creditLimit: { type: Number, default: 0 },
  // Present balance can be negative (Due) or positive (Advance)
  presentBalance: { type: Number, default: 0 },
  // Hidden field used later; do not display in Clients Manager UI
  invoiceDue: { type: Number, default: 0 },
  walkingCustomer: { type: String, enum: ["No", "Yes"], default: "No" },
  active: { type: Boolean, default: true },
  // Relations
  companyId: { type: Types.ObjectId, ref: "Company", index: true },
  createdBy: {
    id: { type: Types.ObjectId, ref: "User" },
    name: { type: String },
  },
  createdAt: { type: String },
  updatedAt: { type: String },
}, { collection: "clients_manager" })

export const Client = models.Client || model("Client", ClientSchema)
