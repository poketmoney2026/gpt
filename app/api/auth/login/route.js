import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { createToken, setAuthCookie } from "@/lib/token";
import User from "@/models/User";

const mobileRegex = /^01\d{9}$/;

export async function POST(request) {
  try {
    const body = await request.json();
    const mobile = String(body.mobile || "").trim();

    if (!mobileRegex.test(mobile)) {
      return NextResponse.json({ ok: false, message: "Login failed" }, { status: 400 });
    }

    await connectDB();

    const adminMobile = String(process.env.ADMIN_MOBILE || "").trim();
    const role = adminMobile && mobile === adminMobile ? "admin" : "user";

    const user = await User.findOneAndUpdate(
      { mobile },
      { $set: { mobile, role, lastLoginAt: new Date() } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    const token = createToken({ userId: String(user._id), mobile: user.mobile, role: user.role });
    const response = NextResponse.json({
      ok: true,
      user: { id: String(user._id), mobile: user.mobile, role: user.role },
    });

    setAuthCookie(response, token);
    return response;
  } catch (error) {
    return NextResponse.json({ ok: false, message: error.message || "Login failed" }, { status: 500 });
  }
}
