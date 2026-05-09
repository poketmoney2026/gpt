import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    orderMobile: {
      type: String,
      required: true,
      trim: true,
      match: /^01\d{9}$/,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
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
        message: "Select exactly three use cases.",
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

OrderSchema.virtual("runningDays").get(function () {
  const start = new Date(this.startDate).getTime();
  const now = Date.now();
  return Math.max(0, Math.min(this.days, Math.floor((now - start) / 86400000)));
});

OrderSchema.virtual("remainingDays").get(function () {
  return Math.max(0, this.days - this.runningDays);
});

OrderSchema.set("toJSON", { virtuals: true });
OrderSchema.set("toObject", { virtuals: true });

export default mongoose.models.Order || mongoose.model("Order", OrderSchema);
