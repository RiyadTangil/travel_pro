import { Schema, model, models, Types } from "mongoose"

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["admin", "company", "user"], default: "user" },
  roleId: { type: Types.ObjectId, ref: "Role" },
  companyId: { type: Types.ObjectId, ref: "Company" },
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  mobile: { type: String }, // Adding mobile as it was in the MOCK_USERS
  userName: { type: String }, // Adding userName as it was in the MOCK_USERS
  status: { type: String, enum: ["active", "inactive"], default: "active" },
}, { timestamps: true, collection: "users" })

if (process.env.NODE_ENV === "development" && models.User) {
  delete models.User
}

export const User = models.User || model("User", UserSchema)