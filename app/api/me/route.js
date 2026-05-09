import { NextResponse } from "next/server";
import { getAuth, publicUser } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request) {
  const auth = await getAuth(request);

  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    user: publicUser(auth.user),
    expiresAt: auth.session.expiresAt,
  });
}
