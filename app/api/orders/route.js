import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getTokenPayload } from "@/lib/token";
import Order from "@/models/Order";

const mobileRegex = /^01\d{9}$/;
const allowedUseCases = [
  "Coding",
  "Analysis",
  "Study",
  "Writing",
  "Research",
  "Graphics",
  "Business",
  "Marketing",
  "Translation",
  "Data Work",
  "Automation",
  "Brainstorming",
];

function orderJson(order) {
  const plain = typeof order.toObject === "function" ? order.toObject({ virtuals: true }) : order;
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
  };
}

export async function GET() {
  try {
    const payload = await getTokenPayload();
    if (!payload?.userId) return NextResponse.json({ ok: false }, { status: 401 });

    await connectDB();
    const orders = await Order.find({ owner: payload.userId }).sort({ createdAt: -1 });
    return NextResponse.json({ ok: true, orders: orders.map(orderJson) });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error.message || "Orders load failed" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const payload = await getTokenPayload();
    if (!payload?.userId) return NextResponse.json({ ok: false }, { status: 401 });

    const body = await request.json();
    const customerName = String(body.customerName || "").trim();
    const orderMobile = String(body.orderMobile || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const plan = body.plan === "personal" ? "personal" : "share";
    const days = Number(body.days);
    const useCases = Array.isArray(body.useCases) ? body.useCases : [];

    if (!customerName || !mobileRegex.test(orderMobile) || !email.includes("@")) {
      return NextResponse.json({ ok: false, message: "Form data ঠিক করুন" }, { status: 400 });
    }

    if (!Number.isInteger(days) || days < 1 || days > 30) {
      return NextResponse.json({ ok: false, message: "Duration ঠিক করুন" }, { status: 400 });
    }

    if (useCases.length !== 3 || useCases.some((item) => !allowedUseCases.includes(item))) {
      return NextResponse.json({ ok: false, message: "Use case ঠিক করুন" }, { status: 400 });
    }

    const pricePerDay = plan === "personal" ? 9 : 6;
    const amount = pricePerDay * days;
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + days * 86400000);

    await connectDB();
    const order = await Order.create({
      owner: payload.userId,
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
    });

    return NextResponse.json({ ok: true, order: orderJson(order) });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error.message || "Order save failed" }, { status: 500 });
  }
}
