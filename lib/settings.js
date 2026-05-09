import { DEFAULT_PLAN_PRICES } from "@/lib/constants";
import Setting from "@/models/Setting";

export const SETTINGS_KEY = "main";

function cleanPrice(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return fallback;
  return Math.round(number * 100) / 100;
}

export async function getSettings() {
  let setting = await Setting.findOne({ key: SETTINGS_KEY }).lean();

  if (!setting) {
    setting = await Setting.create({
      key: SETTINGS_KEY,
      planPrices: DEFAULT_PLAN_PRICES,
    });
    setting = setting.toObject();
  }

  return {
    planPrices: {
      share: cleanPrice(setting?.planPrices?.share, DEFAULT_PLAN_PRICES.share),
      personal: cleanPrice(setting?.planPrices?.personal, DEFAULT_PLAN_PRICES.personal),
    },
  };
}

export async function updateSettings(input) {
  const planPrices = {
    share: cleanPrice(input?.planPrices?.share, DEFAULT_PLAN_PRICES.share),
    personal: cleanPrice(input?.planPrices?.personal, DEFAULT_PLAN_PRICES.personal),
  };

  const setting = await Setting.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $set: { key: SETTINGS_KEY, planPrices } },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
  ).lean();

  return {
    planPrices: {
      share: cleanPrice(setting?.planPrices?.share, DEFAULT_PLAN_PRICES.share),
      personal: cleanPrice(setting?.planPrices?.personal, DEFAULT_PLAN_PRICES.personal),
    },
  };
}
