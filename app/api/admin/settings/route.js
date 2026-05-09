import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getSettings, updateSettings } from "@/lib/settings";
import { getTokenPayload } from "@/lib/token";
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

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, message: "Admin access required" }, { status: 403 });
    const settings = await getSettings();
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error?.message || "Settings load failed" }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, message: "Admin access required" }, { status: 403 });
    const body = await request.json().catch(() => ({}));
    const settings = await updateSettings(body);
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error?.message || "Settings update failed" }, { status: 500 });
  }
}
