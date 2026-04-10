import { Schema, model, models, Types } from "mongoose"

const EmployeeSchema = new Schema({
  name: { type: String, required: true },
  department: { type: String },
  designation: { type: String },
  mobile: { type: String },
  email: { type: String },
  companyId: { type: Types.ObjectId, ref: "Company", index: true, required: true },
  createdAt: { type: String },
  updatedAt: { type: String },
}, { collection: "employees" })

export const Employee = models.Employee || model("Employee", EmployeeSchema)
