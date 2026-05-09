import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getTokenPayload } from "@/lib/token";
import User from "@/models/User";

export async function GET() {
  try {
    const payload = await getTokenPayload();
    if (!payload?.userId) {
      return NextResponse.json({ ok: false, user: null }, { status: 401 });
    }

    await connectDB();
    const user = await User.findById(payload.userId).select("mobile role createdAt").lean();
    if (!user) {
      return NextResponse.json({ ok: false, user: null }, { status: 401 });
    }

    return NextResponse.json({
      ok: true,
      user: { id: String(user._id), mobile: user.mobile, role: user.role, createdAt: user.createdAt },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error.message || "Auth check failed" }, { status: 500 });
  }
}
