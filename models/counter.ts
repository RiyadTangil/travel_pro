import { Schema, model, models } from "mongoose"

const CounterSchema = new Schema({
  key: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
  updatedAt: { type: String },
}, { collection: "counters" })

export const Counter = models.Counter || model("Counter", CounterSchema)

