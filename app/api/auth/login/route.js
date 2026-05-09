import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { createToken, setAuthCookie } from "@/lib/token";
import User from "@/models/User";

const mobileRegex = /^01\d{9}$/;

export async function POST(request) {
  try {
    const { mobile } = await request.json();
    const cleanMobile = String(mobile || "").trim();

    if (!mobileRegex.test(cleanMobile)) {
      return NextResponse.json({ ok: false, message: "Mobile number ঠিক করুন" }, { status: 400 });
    }

    await connectDB();

    const adminMobile = process.env.ADMIN_MOBILE?.trim();
    const role = adminMobile && cleanMobile === adminMobile ? "admin" : "user";

    const user = await User.findOneAndUpdate(
      { mobile: cleanMobile },
      { $set: { lastLoginAt: new Date(), ...(role === "admin" ? { role: "admin" } : {}) } },
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
