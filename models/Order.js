import mongoose from "mongoose";
import {
  DEVICE_BRANDS,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  USE_CASES,
  VERIFY_STATUSES,
} from "@/lib/constants";

const OrderSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    orderMobile: {
      type: String,
      required: true,
      trim: true,
      match: /^01\d{9}$/,
      index: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 120,
      index: true,
    },
    device: {
      type: String,
      enum: DEVICE_BRANDS,
      required: true,
      default: "iPhone",
      index: true,
    },
    plan: {
      type: String,
      enum: ["share", "personal"],
      required: true,
      index: true,
    },
    days: {
      type: Number,
      min: 1,
      max: 30,
      required: true,
    },
    pricePerDay: {
      type: Number,
      required: true,
      min: 0,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
      index: true,
    },
    useCases: {
      type: [String],
      required: true,
      validate: {
        validator(value) {
          const unique = new Set(value || []);
          return Array.isArray(value) && value.length > 0 && value.length === unique.size && value.every((item) => USE_CASES.includes(item));
        },
        message: "At least one valid use case required",
      },
    },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: "unpaid",
      index: true,
    },
    verifyStatus: {
      type: String,
      enum: VERIFY_STATUSES,
      default: "unverified",
      index: true,
    },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: "pending",
      index: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    endDate: {
      type: Date,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ customerName: "text", orderMobile: "text", email: "text", device: "text" });

export default mongoose.models.Order || mongoose.model("Order", OrderSchema);
