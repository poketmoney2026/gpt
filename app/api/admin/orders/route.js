import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { DEVICE_BRANDS, ORDER_STATUSES, PAYMENT_STATUSES, USE_CASES, VERIFY_STATUSES } from "@/lib/constants";
import { getSort, serializeOrder } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { getTokenPayload } from "@/lib/token";
import Order from "@/models/Order";
import User from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bdDayRange(offset = 0) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const todayText = formatter.format(new Date(Date.now() + offset * 24 * 60 * 60 * 1000));
  return {
    start: new Date(`${todayText}T00:00:00.000+06:00`),
    end: new Date(`${todayText}T23:59:59.999+06:00`),
  };
}

function numberParam(params, key) {
  const value = Number(params.get(key));
  return Number.isFinite(value) && value >= 0 ? value : null;
}

async function requireAdmin() {
  const payload = await getTokenPayload();
  if (!payload?.userId) return null;
  await connectDB();
  const user = await User.findById(payload.userId).select("mobile role").lean();
  return user?.role === "admin" ? user : null;
}

async function makeQuery(params) {
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
  if (ORDER_STATUSES.includes(status)) query.status = status;
  if (PAYMENT_STATUSES.includes(paymentStatus)) query.paymentStatus = paymentStatus;
  if (VERIFY_STATUSES.includes(verifyStatus)) query.verifyStatus = verifyStatus;
  if (DEVICE_BRANDS.includes(device)) query.device = device;
  if (USE_CASES.includes(useCase)) query.useCases = useCase;

  const minDays = numberParam(params, "minDays");
  const maxDays = numberParam(params, "maxDays");
  const minAmount = numberParam(params, "minAmount");
  const maxAmount = numberParam(params, "maxAmount");

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

  if (search) {
    const ownerIds = await User.find({ mobile: { $regex: search, $options: "i" } }).select("_id").limit(100).lean();
    query.$or = [
      { customerName: { $regex: search, $options: "i" } },
      { orderMobile: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { device: { $regex: search, $options: "i" } },
      ...(ownerIds.length ? [{ owner: { $in: ownerIds.map((item) => item._id) } }] : []),
    ];
  }

  return query;
}

async function sumAmount(match) {
  const data = await Order.aggregate([
    { $match: match },
    { $group: { _id: null, amount: { $sum: "$amount" }, count: { $sum: 1 } } },
  ]);
  return { amount: Number(data?.[0]?.amount || 0), count: Number(data?.[0]?.count || 0) };
}

async function getDashboardStats() {
  const today = bdDayRange(0);
  const yesterday = bdDayRange(-1);

  const [
    totalUsers,
    newUsersToday,
    totalOrders,
    todayOrders,
    verifiedOrders,
    unverifiedOrders,
    paidTotal,
    unpaidTotal,
    todayPaid,
    yesterdayPaid,
    todayAll,
  ] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ createdAt: { $gte: today.start, $lte: today.end } }),
    Order.countDocuments({}),
    Order.countDocuments({ createdAt: { $gte: today.start, $lte: today.end } }),
    Order.countDocuments({ verifyStatus: "verified" }),
    Order.countDocuments({ verifyStatus: "unverified" }),
    sumAmount({ paymentStatus: "paid" }),
    sumAmount({ paymentStatus: "unpaid" }),
    sumAmount({ paymentStatus: "paid", createdAt: { $gte: today.start, $lte: today.end } }),
    sumAmount({ paymentStatus: "paid", createdAt: { $gte: yesterday.start, $lte: yesterday.end } }),
    sumAmount({ createdAt: { $gte: today.start, $lte: today.end } }),
  ]);

  return {
    totalUsers,
    newUsersToday,
    totalOrders,
    todayOrders,
    verifiedOrders,
    unverifiedOrders,
    totalPaidAmount: paidTotal.amount,
    totalUnpaidAmount: unpaidTotal.amount,
    todayIncome: todayPaid.amount,
    yesterdayIncome: yesterdayPaid.amount,
    todayOrderAmount: todayAll.amount,
  };
}

export async function GET(request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, message: "Admin access required" }, { status: 403 });

    const params = request.nextUrl.searchParams;
    const query = await makeQuery(params);
    const sort = getSort(String(params.get("sort") || "newest"));

    const [orders, stats, settings] = await Promise.all([
      Order.find(query).populate("owner", "mobile").sort(sort).limit(1000).lean(),
      getDashboardStats(),
      getSettings(),
    ]);

    return NextResponse.json({ ok: true, orders: orders.map(serializeOrder), stats, settings });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error?.message || "Admin orders load failed" },
      { status: 500 }
    );
  }
}
