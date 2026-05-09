import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ORDER_STATUSES, PAYMENT_STATUSES, VERIFY_STATUSES } from "@/lib/constants";
import { serializeOrder } from "@/lib/orders";
import { getTokenPayload } from "@/lib/token";
import Order from "@/models/Order";
import User from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin() {
  const payload = await getTokenPayload();
  if (!payload?.userId) return null;
  await connectDB();
  const user = await User.findById(payload.userId).select("mobile role").lean();
  return user?.role === "admin" ? user : null;
}

export async function PATCH(request, context) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, message: "Admin access required" }, { status: 403 });

    const { id } = await context.params;
    const order = await Order.findById(id);
    if (!order) return NextResponse.json({ ok: false, message: "Order not found" }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const patch = {};
    if (ORDER_STATUSES.includes(body.status)) patch.status = body.status;
    if (PAYMENT_STATUSES.includes(body.paymentStatus)) patch.paymentStatus = body.paymentStatus;
    if (VERIFY_STATUSES.includes(body.verifyStatus)) patch.verifyStatus = body.verifyStatus;

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ ok: false, message: "No valid update found" }, { status: 400 });
    }

    order.set(patch);
    await order.save();
    await order.populate("owner", "mobile");

    return NextResponse.json({ ok: true, order: serializeOrder(order) });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error?.message || "Order update failed" }, { status: 500 });
  }
}
