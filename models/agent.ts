import { Schema, model, models } from "mongoose"

const AgentSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String },
  mobile: { type: String },
  companyId: { type: String },
  createdAt: { type: String },
  updatedAt: { type: String },
}, { collection: "agents" })

export const Agent = models.Agent || model("Agent", AgentSchema)
