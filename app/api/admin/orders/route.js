import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getTokenPayload } from "@/lib/token";
import Order from "@/models/Order";
import User from "@/models/User";

function serialize(order) {
  const plain = order.toObject({ virtuals: true });
  const start = new Date(plain.startDate).getTime();
  const runningDays = Math.max(0, Math.min(plain.days, Math.floor((Date.now() - start) / 86400000)));
  return {
    id: String(plain._id),
    customerName: plain.customerName,
    orderMobile: plain.orderMobile,
    email: plain.email,
    plan: plain.plan,
    days: plain.days,
    pricePerDay: plain.pricePerDay,
    amount: plain.amount,
    useCases: plain.useCases,
    status: plain.status,
    runningDays,
    remainingDays: Math.max(0, plain.days - runningDays),
    startDate: plain.startDate,
    endDate: plain.endDate,
    createdAt: plain.createdAt,
    ownerMobile: plain.owner?.mobile || "",
  };
}

export async function GET(request) {
  try {
    const payload = await getTokenPayload();
    if (!payload?.userId) return NextResponse.json({ ok: false }, { status: 401 });

    await connectDB();
    const user = await User.findById(payload.userId).select("role").lean();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ ok: false, message: "Admin access required" }, { status: 403 });
    }

    const params = request.nextUrl.searchParams;
    const query = {};
    const search = params.get("search")?.trim();
    const plan = params.get("plan")?.trim();
    const status = params.get("status")?.trim();
    const useCase = params.get("useCase")?.trim();
    const minDays = Number(params.get("minDays") || 0);
    const maxDays = Number(params.get("maxDays") || 0);
    const minAmount = Number(params.get("minAmount") || 0);
    const maxAmount = Number(params.get("maxAmount") || 0);
    const from = params.get("from")?.trim();
    const to = params.get("to")?.trim();

    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: "i" } },
        { orderMobile: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    if (["personal", "share"].includes(plan)) query.plan = plan;
    if (["pending", "active", "completed", "cancelled"].includes(status)) query.status = status;
    if (useCase) query.useCases = useCase;
    if (minDays || maxDays) query.days = { ...(minDays ? { $gte: minDays } : {}), ...(maxDays ? { $lte: maxDays } : {}) };
    if (minAmount || maxAmount) query.amount = { ...(minAmount ? { $gte: minAmount } : {}), ...(maxAmount ? { $lte: maxAmount } : {}) };
    if (from || to) query.createdAt = { ...(from ? { $gte: new Date(from) } : {}), ...(to ? { $lte: new Date(`${to}T23:59:59.999Z`) } : {}) };

    const sortParam = params.get("sort") || "newest";
    const sort =
      sortParam === "amountHigh" ? { amount: -1 } :
      sortParam === "amountLow" ? { amount: 1 } :
      sortParam === "daysHigh" ? { days: -1 } :
      sortParam === "daysLow" ? { days: 1 } :
      { createdAt: -1 };

    const orders = await Order.find(query).populate("owner", "mobile").sort(sort).limit(300);
    return NextResponse.json({ ok: true, orders: orders.map(serialize) });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error.message || "Admin orders load failed" }, { status: 500 });
  }
}
