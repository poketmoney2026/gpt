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

async function getOwnedOrder(id, userId) {
  if (!id) return null;
  return Order.findOne({ _id: id, owner: userId });
}

export async function PATCH(request, context) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, message: "Login required" }, { status: 401 });

    const { id } = await context.params;
    const order = await getOwnedOrder(id, user._id);
    if (!order) return NextResponse.json({ ok: false, message: "Order not found" }, { status: 404 });
    if (order.verifyStatus === "verified") {
      return NextResponse.json({ ok: false, message: "Verified order edit করা যাবে না।" }, { status: 403 });
    }

    let body = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ ok: false, message: "অর্ডার ডাটা পাওয়া যায়নি।" }, { status: 400 });
    }

    const settings = await getSettings();
    const checked = validateOrderPayload(body, settings.planPrices);
    if (!checked.ok) return NextResponse.json({ ok: false, message: checked.message }, { status: 400 });

    order.set({ ...checked.order });
    await order.save();

    return NextResponse.json({ ok: true, order: serializeOrder(order) });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error?.message || "Order update failed" }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, message: "Login required" }, { status: 401 });

    const { id } = await context.params;
    const order = await getOwnedOrder(id, user._id);
    if (!order) return NextResponse.json({ ok: false, message: "Order not found" }, { status: 404 });
    if (order.verifyStatus === "verified") {
      return NextResponse.json({ ok: false, message: "Verified order delete করা যাবে না।" }, { status: 403 });
    }

    await order.deleteOne();
    return NextResponse.json({ ok: true, deletedId: id });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error?.message || "Order delete failed" }, { status: 500 });
  }
}
