import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ORDER_STATUSES, USE_CASES } from "@/lib/constants";
import { serializeOrder } from "@/lib/orders";
import { getTokenPayload } from "@/lib/token";
import Order from "@/models/Order";
import User from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function numberParam(params, key) {
  const value = Number(params.get(key));
  return Number.isFinite(value) && value > 0 ? value : null;
}

async function requireAdmin() {
  const payload = await getTokenPayload();
  if (!payload?.userId) return null;

  await connectDB();
  const user = await User.findById(payload.userId).select("mobile role").lean();
  return user?.role === "admin" ? user : null;
}

export async function GET(request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ ok: false, message: "Admin access required" }, { status: 403 });
    }

    const params = request.nextUrl.searchParams;
    const query = {};
    const search = String(params.get("search") || "").trim();
    const plan = String(params.get("plan") || "").trim();
    const status = String(params.get("status") || "").trim();
    const useCase = String(params.get("useCase") || "").trim();
    const from = String(params.get("from") || "").trim();
    const to = String(params.get("to") || "").trim();

    if (["personal", "share"].includes(plan)) query.plan = plan;
    if (ORDER_STATUSES.includes(status)) query.status = status;
    if (USE_CASES.includes(useCase)) query.useCases = useCase;

    const minDays = numberParam(params, "minDays");
    const maxDays = numberParam(params, "maxDays");
    const minAmount = numberParam(params, "minAmount");
    const maxAmount = numberParam(params, "maxAmount");

    if (minDays || maxDays) {
      query.days = {
        ...(minDays ? { $gte: minDays } : {}),
        ...(maxDays ? { $lte: maxDays } : {}),
      };
    }

    if (minAmount || maxAmount) {
      query.amount = {
        ...(minAmount ? { $gte: minAmount } : {}),
        ...(maxAmount ? { $lte: maxAmount } : {}),
      };
    }

    if (from || to) {
      query.createdAt = {
        ...(from ? { $gte: new Date(`${from}T00:00:00.000+06:00`) } : {}),
        ...(to ? { $lte: new Date(`${to}T23:59:59.999+06:00`) } : {}),
      };
    }

    if (search) {
      const userMatches = await User.find({ mobile: { $regex: search, $options: "i" } })
        .select("_id")
        .limit(50)
        .lean();
      const ownerIds = userMatches.map((item) => item._id);

      query.$or = [
        { customerName: { $regex: search, $options: "i" } },
        { orderMobile: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        ...(ownerIds.length ? [{ owner: { $in: ownerIds } }] : []),
      ];
    }

    const sortParam = String(params.get("sort") || "newest");
    const sort =
      sortParam === "oldest" ? { createdAt: 1 } :
      sortParam === "amountHigh" ? { amount: -1 } :
      sortParam === "amountLow" ? { amount: 1 } :
      sortParam === "daysHigh" ? { days: -1 } :
      sortParam === "daysLow" ? { days: 1 } :
      { createdAt: -1 };

    const orders = await Order.find(query).populate("owner", "mobile").sort(sort).limit(500).lean();

    return NextResponse.json({
      ok: true,
      orders: orders.map(serializeOrder),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error?.message || "Admin orders load failed" },
      { status: 500 }
    );
  }
}
