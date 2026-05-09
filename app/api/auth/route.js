import { NextResponse } from "next/server";
import {
  adminNumbers,
  createSession,
  mobileRegex,
  publicUser,
  readDb,
  uid,
  writeDb,
} from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json();
    const number = String(body.number || "").trim();

    if (!mobileRegex.test(number)) {
      return NextResponse.json(
        { message: "মোবাইল নাম্বার অবশ্যই ১১ ডিজিট এবং 01 দিয়ে শুরু হতে হবে।" },
        { status: 400 }
      );
    }

    const db = await readDb();
    let user = db.users.find((item) => item.number === number);
    const now = new Date().toISOString();

    if (!user) {
      const role = adminNumbers().includes(number) ? "admin" : "user";
      user = {
        id: uid("user"),
        name: role === "admin" ? "Admin" : `User ${number.slice(-4)}`,
        number,
        role,
        createdAt: now,
        updatedAt: now,
      };
      db.users.push(user);
      await writeDb(db);
    } else if (adminNumbers().includes(number) && user.role !== "admin") {
      user.role = "admin";
      user.updatedAt = now;
      await writeDb(db);
    }

    const session = await createSession(user.id);

    return NextResponse.json({
      user: publicUser(user),
      token: session.token,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    return NextResponse.json(
      { message: "লগইন করা যায়নি। আবার চেষ্টা করুন।", error: error.message },
      { status: 500 }
    );
  }
}
