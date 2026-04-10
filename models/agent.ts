import { Schema, model, models, Types } from "mongoose"

const AgentSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String },
  mobile: { type: String },
  companyId: { type: Types.ObjectId, ref: "Company", index: true, required: true },
  createdAt: { type: String },
  updatedAt: { type: String },
}, { collection: "agents" })

export const Agent = models.Agent || model("Agent", AgentSchema)
