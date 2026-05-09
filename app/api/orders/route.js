import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getTokenPayload } from "@/lib/token";
import { serializeOrder } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { validateOrderPayload } from "@/lib/validation";
import Order from "@/models/Order";
import User from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getCurrentUser() {
  const payload = await getTokenPayload();
  if (!payload?.userId) return null;
  await connectDB();
  return User.findById(payload.userId).select("mobile role").lean();
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, message: "Login required" }, { status: 401 });

    const [orders, settings] = await Promise.all([
      Order.find({ owner: user._id }).sort({ createdAt: -1 }).limit(300).lean(),
      getSettings(),
    ]);

    return NextResponse.json({ ok: true, orders: orders.map(serializeOrder), settings });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error?.message || "Orders load failed" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, message: "Login required" }, { status: 401 });

    let body = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ ok: false, message: "অর্ডার ডাটা পাওয়া যায়নি।" }, { status: 400 });
    }

    const settings = await getSettings();
    const checked = validateOrderPayload(body, settings.planPrices);
    if (!checked.ok) {
      return NextResponse.json({ ok: false, message: checked.message }, { status: 400 });
    }

    const order = await Order.create({
      owner: user._id,
      ...checked.order,
      paymentStatus: "unpaid",
      verifyStatus: "unverified",
      status: "pending",
    });

    return NextResponse.json({ ok: true, order: serializeOrder(order), settings });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error?.message || "Order save failed" },
      { status: 500 }
    );
  }
}
