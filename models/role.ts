import { Schema, model, models, Types } from "mongoose"

const RoleSchema = new Schema({
  name: { type: String, required: true },
  companyId: { type: Types.ObjectId, ref: "Company", index: true, required: true },
  permissions: [{ type: String }],
  isDefault: { type: Boolean, default: false },
  roleType: { type: String, enum: ["employee", "account",'admin'], default: "employee" },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
}, { timestamps: true, collection: "roles" })

if (process.env.NODE_ENV === "development" && models.Role) {
  delete models.Role
}

export const Role = models.Role || model("Role", RoleSchema)