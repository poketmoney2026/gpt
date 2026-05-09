import mongoose from "mongoose";

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
      maxlength: 80,
    },
    orderMobile: {
      type: String,
      required: true,
      trim: true,
      match: /^01\d{9}$/,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 120,
    },
    plan: {
      type: String,
      enum: ["personal", "share"],
      required: true,
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
    },
    amount: {
      type: Number,
      required: true,
    },
    useCases: {
      type: [String],
      validate: {
        validator: (value) => Array.isArray(value) && value.length === 3,
        message: "Three use cases required",
      },
    },
    status: {
      type: String,
      enum: ["pending", "active", "completed", "cancelled"],
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

export default mongoose.models.Order || mongoose.model("Order", OrderSchema);
