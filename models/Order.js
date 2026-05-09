import mongoose from "mongoose";
import { ORDER_STATUSES, PLAN_PRICES, USE_CASES } from "@/lib/constants";

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
    plan: {
      type: String,
      enum: Object.keys(PLAN_PRICES),
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
          return Array.isArray(value) && value.length === 3 && unique.size === 3 && value.every((item) => USE_CASES.includes(item));
        },
        message: "Three valid use cases required",
      },
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
    },
    endDate: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ customerName: "text", orderMobile: "text", email: "text" });

export default mongoose.models.Order || mongoose.model("Order", OrderSchema);
