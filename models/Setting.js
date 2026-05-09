import mongoose from "mongoose";
import { DEFAULT_PLAN_PRICES } from "@/lib/constants";

const SettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    planPrices: {
      share: {
        type: Number,
        default: DEFAULT_PLAN_PRICES.share,
        min: 0,
      },
      personal: {
        type: Number,
        default: DEFAULT_PLAN_PRICES.personal,
        min: 0,
      },
    },
  },
  { timestamps: true }
);

export default mongoose.models.Setting || mongoose.model("Setting", SettingSchema);
