import { Schema, model, models, Types } from "mongoose"

const ClientCategorySchema = new Schema({
  name: { type: String, required: true, index: true },
  prefix: { type: String, required: true },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  companyId: { type: Types.ObjectId, ref: "Company", index: true },
  createdAt: { type: String },
  updatedAt: { type: String },
}, { collection: "client_categories" })

export const ClientCategory = models.ClientCategory || model("ClientCategory", ClientCategorySchema)
