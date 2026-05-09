import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { createToken, setAuthCookie } from "@/lib/token";
import { validateLoginPayload } from "@/lib/validation";
import User from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    let body = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ ok: false, message: "মোবাইল নাম্বার দিন।" }, { status: 400 });
    }

    const checked = validateLoginPayload(body);
    if (!checked.ok) {
      return NextResponse.json({ ok: false, message: checked.message }, { status: 400 });
    }

    await connectDB();

    const adminMobile = String(process.env.ADMIN_MOBILE || "").trim();
    const role = adminMobile && checked.mobile === adminMobile ? "admin" : "user";

    const user = await User.findOneAndUpdate(
      { mobile: checked.mobile },
      { $set: { mobile: checked.mobile, role, lastLoginAt: new Date() } },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    ).lean();

    const token = createToken({ userId: String(user._id), mobile: user.mobile, role: user.role });
    const response = NextResponse.json({
      ok: true,
      user: { id: String(user._id), mobile: user.mobile, role: user.role },
    });

    setAuthCookie(response, token);
    return response;
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error?.message || "সার্ভারে সমস্যা হয়েছে।" },
      { status: 500 }
    );
  }
}
