import { Schema, model, models, Types } from "mongoose"

const RefundTicketItemSchema = new Schema({
  ticketId: { type: Types.ObjectId }, // Can refer to InvoiceTicket or InvoiceItem
  ticketNo: { type: String },
  paxName: { type: String },
  pnr: { type: String },
  gdsPnr: { type: String },
  airline: { type: String },
  route: { type: String },
  journeyDate: { type: String },
  returnDate: { type: String },
  ticketType: { type: String },
  airbusClass: { type: String },
  sellPrice: { type: Number },
  purchasePrice: { type: Number },
  refundChargeFromClient: { type: Number, default: 0 },
  refundChargeTakenByVendor: { type: Number, default: 0 },
  clientReturnAmount: { type: Number },
  vendorReturnAmount: { type: Number },
}, { _id: false })

const AirticketRefundSchema = new Schema({
  voucherNo: { type: String, required: true, unique: true },
  invoiceId: { type: Types.ObjectId, ref: "Invoice", required: true, index: true },
  clientId: { type: Types.ObjectId, ref: "Client", required: true, index: true },
  companyId: { type: Types.ObjectId, ref: "Company", required: true, index: true },
  refundDate: { type: String, required: true },
  tickets: [RefundTicketItemSchema],
  
  // Client Refund Info
  clientRefundType: { type: String, enum: ["BALANCE_ADJUSTMENT", "MONEY_RETURN"], required: true },
  clientTotalRefund: { type: Number, default: 0 },
  clientTotalCharge: { type: Number, default: 0 },
  clientReturnAmount: { type: Number, default: 0 },
  clientPaymentMethod: { type: String }, // For MONEY_RETURN
  clientAccountId: { type: Types.ObjectId, ref: "Account" }, // For MONEY_RETURN
  
  // Vendor Refund Info
  vendorId: { type: Types.ObjectId, ref: "Vendor", index: true },
  vendorRefundType: { type: String, enum: ["BALANCE_ADJUSTMENT", "MONEY_RETURN"], required: true },
  vendorTotalRefund: { type: Number, default: 0 },
  vendorTotalCharge: { type: Number, default: 0 },
  vendorReturnAmount: { type: Number, default: 0 },
  vendorPaymentMethod: { type: String }, // For MONEY_RETURN
  vendorAccountId: { type: Types.ObjectId, ref: "Account" }, // For MONEY_RETURN
  
  refundProfit: { type: Number, default: 0 },
  
  note: { type: String },
  isDeleted: { type: Boolean, default: false, index: true },
  createdAt: { type: String },
  updatedAt: { type: String },
}, { collection: "airticket_refunds" })

// Prevent model caching during development
if (process.env.NODE_ENV === "development" && models.AirticketRefund) {
  delete models.AirticketRefund
}

export const AirticketRefund = models.AirticketRefund || model("AirticketRefund", AirticketRefundSchema)
