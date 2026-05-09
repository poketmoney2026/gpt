export function getOrderDays(order) {
  const days = Number(order?.days || 0);
  const startTime = new Date(order?.startDate || order?.createdAt || Date.now()).getTime();
  const now = Date.now();
  const runningDays = Number.isFinite(startTime)
    ? Math.max(0, Math.min(days, Math.floor((now - startTime) / (24 * 60 * 60 * 1000))))
    : 0;

  return {
    runningDays,
    remainingDays: Math.max(0, days - runningDays),
  };
}

export function serializeOrder(order) {
  const data = typeof order?.toObject === "function" ? order.toObject() : order;
  const daysData = getOrderDays(data);

  return {
    id: String(data._id),
    customerName: data.customerName || "",
    orderMobile: data.orderMobile || "",
    email: data.email || "",
    plan: data.plan || "share",
    days: Number(data.days || 0),
    pricePerDay: Number(data.pricePerDay || 0),
    amount: Number(data.amount || 0),
    useCases: Array.isArray(data.useCases) ? data.useCases : [],
    status: data.status || "pending",
    startDate: data.startDate,
    endDate: data.endDate,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    runningDays: daysData.runningDays,
    remainingDays: daysData.remainingDays,
    ownerMobile: data.owner?.mobile || data.ownerMobile || "",
  };
}
