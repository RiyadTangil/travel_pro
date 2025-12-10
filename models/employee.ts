import { Schema, model, models } from "mongoose"

const EmployeeSchema = new Schema({
  name: { type: String, required: true },
  department: { type: String },
  designation: { type: String },
  mobile: { type: String },
  email: { type: String },
  companyId: { type: String },
  createdAt: { type: String },
  updatedAt: { type: String },
}, { collection: "employees" })

export const Employee = models.Employee || model("Employee", EmployeeSchema)
