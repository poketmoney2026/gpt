import { DAY_MS } from "@/lib/constants";

export function getOrderTime(order) {
  const days = Number(order?.days || 0);
  const startTime = new Date(order?.startDate || order?.createdAt || Date.now()).getTime();
  const endTime = new Date(order?.endDate || startTime + days * DAY_MS).getTime();
  const now = Date.now();

  const runningDays = Number.isFinite(startTime)
    ? Math.max(0, Math.min(days, Math.floor((now - startTime) / DAY_MS)))
    : 0;

  const remainingMs = Number.isFinite(endTime) ? Math.max(0, endTime - now) : 0;
  const remainingDays = Math.ceil(remainingMs / DAY_MS);

  return {
    runningDays,
    remainingDays: Math.max(0, Math.min(days, remainingDays)),
    remainingMs,
    expired: remainingMs <= 0,
  };
}

export function serializeOrder(order) {
  const data = typeof order?.toObject === "function" ? order.toObject() : order;
  const timeData = getOrderTime(data);

  return {
    id: String(data._id),
    customerName: data.customerName || "",
    orderMobile: data.orderMobile || "",
    email: data.email || "",
    device: data.device || "Other",
    plan: data.plan || "share",
    days: Number(data.days || 0),
    pricePerDay: Number(data.pricePerDay || 0),
    amount: Number(data.amount || 0),
    useCases: Array.isArray(data.useCases) ? data.useCases : [],
    paymentStatus: data.paymentStatus || "unpaid",
    verifyStatus: data.verifyStatus || "unverified",
    status: data.status || "pending",
    startDate: data.startDate || data.createdAt,
    endDate: data.endDate,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    runningDays: timeData.runningDays,
    remainingDays: timeData.remainingDays,
    remainingMs: timeData.remainingMs,
    expired: timeData.expired,
    ownerMobile: data.owner?.mobile || data.ownerMobile || "",
  };
}

export function buildOrderQuery(params, UserModel) {
  const query = {};
  const search = String(params.get("search") || "").trim();
  const plan = String(params.get("plan") || "").trim();
  const status = String(params.get("status") || "").trim();
  const paymentStatus = String(params.get("paymentStatus") || "").trim();
  const verifyStatus = String(params.get("verifyStatus") || "").trim();
  const device = String(params.get("device") || "").trim();
  const useCase = String(params.get("useCase") || "").trim();
  const from = String(params.get("from") || "").trim();
  const to = String(params.get("to") || "").trim();

  if (["personal", "share"].includes(plan)) query.plan = plan;
  if (["pending", "active", "completed", "cancelled"].includes(status)) query.status = status;
  if (["paid", "unpaid"].includes(paymentStatus)) query.paymentStatus = paymentStatus;
  if (["verified", "unverified"].includes(verifyStatus)) query.verifyStatus = verifyStatus;
  if (device) query.device = device;
  if (useCase) query.useCases = useCase;

  function numberParam(key) {
    const value = Number(params.get(key));
    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  const minDays = numberParam("minDays");
  const maxDays = numberParam("maxDays");
  const minAmount = numberParam("minAmount");
  const maxAmount = numberParam("maxAmount");

  if (minDays !== null || maxDays !== null) {
    query.days = {
      ...(minDays !== null ? { $gte: minDays } : {}),
      ...(maxDays !== null ? { $lte: maxDays } : {}),
    };
  }

  if (minAmount !== null || maxAmount !== null) {
    query.amount = {
      ...(minAmount !== null ? { $gte: minAmount } : {}),
      ...(maxAmount !== null ? { $lte: maxAmount } : {}),
    };
  }

  if (from || to) {
    query.createdAt = {
      ...(from ? { $gte: new Date(`${from}T00:00:00.000+06:00`) } : {}),
      ...(to ? { $lte: new Date(`${to}T23:59:59.999+06:00`) } : {}),
    };
  }

  return { query, search };
}

export function getSort(sortParam) {
  return sortParam === "oldest" ? { createdAt: 1 } :
    sortParam === "amountHigh" ? { amount: -1 } :
    sortParam === "amountLow" ? { amount: 1 } :
    sortParam === "daysHigh" ? { days: -1 } :
    sortParam === "daysLow" ? { days: 1 } :
    { createdAt: -1 };
}
