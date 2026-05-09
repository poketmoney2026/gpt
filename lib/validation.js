import { DAY_MS, DEVICE_BRANDS, USE_CASES } from "@/lib/constants";

const mobileRegex = /^01\d{9}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeMobile(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 11);
}

export function mobileError(value) {
  const raw = String(value || "").trim();
  const digits = raw.replace(/\D/g, "");

  if (!raw) return "মোবাইল নাম্বার দিন।";
  if (/[^0-9\s+-]/.test(raw)) return "শুধু সংখ্যার মোবাইল নাম্বার দিন।";
  if (!digits.startsWith("0")) return "আপনার ১১ সংখ্যার নাম্বারটি দিন।";
  if (!digits.startsWith("01")) return "নাম্বারটি 01 দিয়ে শুরু হতে হবে।";
  if (digits.length !== 11) return "আপনার ১১ সংখ্যার নাম্বারটি দিন।";
  if (!mobileRegex.test(digits)) return "সঠিক মোবাইল নাম্বার দিন।";
  return "";
}

export function isValidMobile(value) {
  return mobileRegex.test(String(value || ""));
}

export function normalizePlan(value) {
  return value === "personal" ? "personal" : "share";
}

export function normalizeDays(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 1;
  return Math.min(30, Math.max(1, Math.trunc(number)));
}

function cleanText(value, max = 80) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, max);
}

export function validateLoginPayload(body) {
  const mobile = normalizeMobile(body?.mobile);
  const error = mobileError(body?.mobile);
  if (error) return { ok: false, message: error };
  return { ok: true, mobile };
}

export function validateOrderPayload(body, planPrices) {
  const customerName = cleanText(body?.customerName, 80);
  const mobileMessage = mobileError(body?.orderMobile);
  const orderMobile = normalizeMobile(body?.orderMobile);
  const email = String(body?.email || "").trim().toLowerCase().slice(0, 120);
  const device = DEVICE_BRANDS.includes(body?.device) ? body.device : "Other";
  const plan = normalizePlan(body?.plan);
  const days = normalizeDays(body?.days);
  const useCases = Array.isArray(body?.useCases)
    ? [...new Set(body.useCases.map((item) => cleanText(item, 32)).filter(Boolean))]
    : [];

  if (customerName.length < 2 || customerName.length > 80) {
    return { ok: false, message: "কমপক্ষে ২ অক্ষরের নাম দিন।" };
  }

  if (mobileMessage) return { ok: false, message: mobileMessage };

  if (!emailRegex.test(email)) {
    return { ok: false, message: "সঠিক ইমেইল দিন।" };
  }

  if (!DEVICE_BRANDS.includes(device)) {
    return { ok: false, message: "ডিভাইস সিলেক্ট করুন।" };
  }

  if (useCases.length < 1 || useCases.some((item) => !USE_CASES.includes(item))) {
    return { ok: false, message: "কমপক্ষে ১টি ইউজ কেস সিলেক্ট করুন।" };
  }

  const pricePerDay = Number(planPrices?.[plan] ?? 0);
  const amount = Math.round(pricePerDay * days * 100) / 100;
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + days * DAY_MS);

  return {
    ok: true,
    order: {
      customerName,
      orderMobile,
      email,
      device,
      plan,
      days,
      pricePerDay,
      amount,
      useCases,
      startDate,
      endDate,
    },
  };
}
