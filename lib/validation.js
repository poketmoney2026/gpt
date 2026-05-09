import { PLAN_PRICES, USE_CASES } from "@/lib/constants";

const mobileRegex = /^01\d{9}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeMobile(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 11);
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

export function validateLoginPayload(body) {
  const mobile = normalizeMobile(body?.mobile);
  if (!isValidMobile(mobile)) {
    return { ok: false, message: "Login failed" };
  }
  return { ok: true, mobile };
}

export function validateOrderPayload(body) {
  const customerName = String(body?.customerName || "").trim().replace(/\s+/g, " ");
  const orderMobile = normalizeMobile(body?.orderMobile);
  const email = String(body?.email || "").trim().toLowerCase();
  const plan = normalizePlan(body?.plan);
  const days = normalizeDays(body?.days);
  const useCases = Array.isArray(body?.useCases)
    ? [...new Set(body.useCases.map((item) => String(item || "").trim()))]
    : [];

  if (customerName.length < 2 || customerName.length > 80) {
    return { ok: false, message: "Name save failed" };
  }

  if (!isValidMobile(orderMobile)) {
    return { ok: false, message: "Mobile save failed" };
  }

  if (!emailRegex.test(email) || email.length > 120) {
    return { ok: false, message: "Email save failed" };
  }

  if (useCases.length !== 3 || useCases.some((item) => !USE_CASES.includes(item))) {
    return { ok: false, message: "Use case save failed" };
  }

  const pricePerDay = PLAN_PRICES[plan];
  const amount = pricePerDay * days;
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000);

  return {
    ok: true,
    order: {
      customerName,
      orderMobile,
      email,
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
