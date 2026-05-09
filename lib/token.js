import crypto from "crypto";
import { cookies } from "next/headers";

export const COOKIE_NAME = "auth_token";
export const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function sign(value) {
  const secret = process.env.TOKEN_SECRET || "local-dev-secret";
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

export function createToken(payload) {
  const data = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ONE_YEAR_SECONDS,
  };
  const body = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifyToken(token) {
  if (!token || !token.includes(".")) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature || signature !== sign(body)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function setAuthCookie(response, token) {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });
}

export function clearAuthCookie(response) {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getTokenPayload() {
  const cookieStore = await cookies();
  return verifyToken(cookieStore.get(COOKIE_NAME)?.value);
}
