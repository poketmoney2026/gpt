import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearAuthCookie(response);
  return response;
}
