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
    const now = new Date().toISOString();
    const isAdminNumber = adminNumbers().includes(number);
    let user = db.users.find((item) => item.number === number);

    if (!user && !isAdminNumber) {
      return NextResponse.json(
        { message: "এই নাম্বারে কোনো account পাওয়া যায়নি। আগে admin থেকে account/package create করতে হবে।" },
        { status: 404 }
      );
    }

    if (!user && isAdminNumber) {
      user = {
        id: uid("user"),
        name: "Admin",
        number,
        email: "",
        role: "admin",
        createdAt: now,
        updatedAt: now,
      };
      db.users.push(user);
      await writeDb(db);
    } else if (isAdminNumber && user.role !== "admin") {
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
      { message: error.message || "Visit করা যায়নি। আবার চেষ্টা করুন।" },
      { status: 500 }
    );
  }
}
