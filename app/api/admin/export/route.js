import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { DEVICE_BRANDS, ORDER_STATUSES, PAYMENT_STATUSES, USE_CASES, VERIFY_STATUSES } from "@/lib/constants";
import { getSort, serializeOrder } from "@/lib/orders";
import { getTokenPayload } from "@/lib/token";
import Order from "@/models/Order";
import User from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bdDateText(offset = 0) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(Date.now() + offset * 24 * 60 * 60 * 1000));
}

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
  const scope = String(params.get("scope") || "filtered");

  if (scope === "today") {
    const today = bdDateText();
    query.createdAt = {
      $gte: new Date(`${today}T00:00:00.000+06:00`),
      $lte: new Date(`${today}T23:59:59.999+06:00`),
    };
    return query;
  }

  if (scope === "all") return query;

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

  if (minDays !== null || maxDays !== null) query.days = { ...(minDays !== null ? { $gte: minDays } : {}), ...(maxDays !== null ? { $lte: maxDays } : {}) };
  if (minAmount !== null || maxAmount !== null) query.amount = { ...(minAmount !== null ? { $gte: minAmount } : {}), ...(maxAmount !== null ? { $lte: maxAmount } : {}) };
  if (from || to) query.createdAt = { ...(from ? { $gte: new Date(`${from}T00:00:00.000+06:00`) } : {}), ...(to ? { $lte: new Date(`${to}T23:59:59.999+06:00`) } : {}) };

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

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", hour12: true });
}

export async function GET(request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, message: "Admin access required" }, { status: 403 });

    const params = request.nextUrl.searchParams;
    const query = await makeQuery(params);
    const sort = getSort(String(params.get("sort") || "newest"));
    const rows = await Order.find(query).populate("owner", "mobile").sort(sort).limit(5000).lean();
    const orders = rows.map(serializeOrder);

    const tableRows = orders.map((order, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${esc(order.ownerMobile)}</td>
        <td>${esc(order.customerName)}</td>
        <td>${esc(order.orderMobile)}</td>
        <td>${esc(order.email)}</td>
        <td>${esc(order.device)}</td>
        <td>${esc(order.plan)}</td>
        <td>${esc(order.days)}</td>
        <td>${esc(order.pricePerDay)}</td>
        <td>${esc(order.amount)}</td>
        <td>${esc(order.useCases.join(", "))}</td>
        <td>${esc(order.paymentStatus)}</td>
        <td>${esc(order.verifyStatus)}</td>
        <td>${esc(order.status)}</td>
        <td>${esc(formatDate(order.createdAt))}</td>
        <td>${esc(formatDate(order.startDate))}</td>
        <td>${esc(formatDate(order.endDate))}</td>
      </tr>`).join("");

    const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body>
      <table border="1">
        <thead><tr>
          <th>#</th><th>Owner Mobile</th><th>Name</th><th>Mobile</th><th>Email</th><th>Device</th><th>Plan</th><th>Days</th><th>Price/Day</th><th>Amount</th><th>Use Cases</th><th>Payment</th><th>Verify</th><th>Status</th><th>Added Time</th><th>Start Time</th><th>End Time</th>
        </tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </body></html>`;

    const filename = `gpt-orders-${String(params.get("scope") || "filtered")}-${Date.now()}.xls`;
    return new NextResponse(html, {
      headers: {
        "Content-Type": "application/vnd.ms-excel; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error?.message || "Export failed" }, { status: 500 });
  }
}
