import { Schema, model, models } from "mongoose"

const PassportSchema = new Schema({
  clientId:     { type: String, index: true, default: null },
  passportNo:   { type: String, required: true, index: true },
  paxType:      { type: String, default: "" },
  name:         { type: String, required: true },
  mobile:       { type: String, required: true },
  email:        { type: String, default: "" },
  nid:          { type: String, default: "" },
  dob:          { type: String, default: "" },
  dateOfIssue:  { type: String, default: "" },
  dateOfExpire: { type: String, default: "" },
  note:         { type: String, default: "" },
  status:       { type: String, enum: ["PENDING", "APPROVED", "DELIVERED"], default: "PENDING", index: true },
  scanCopyUrl:  { type: String, default: "" },
  othersDocUrl: { type: String, default: "" },
  imageUrl:     { type: String, default: "" },
  companyId:    { type: String, index: true, required: true },
  createdAt:    { type: Date, default: () => new Date() },
  updatedAt:    { type: Date, default: () => new Date() },
}, { collection: "passports" })

export const PassportModel = models.Passport || model("Passport", PassportSchema)
