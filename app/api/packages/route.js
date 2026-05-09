import { NextResponse } from "next/server";
import { adminNumbers, getAuth, mobileRegex, uid, withRemaining, writeDb } from "@/lib/db";

export const runtime = "nodejs";

const allowedPlans = ["share", "personal"];

const sanitizePackagePayload = (body) => {
  const days = Number(body.days || 0);
  const planType = allowedPlans.includes(body.planType) ? body.planType : "share";
  const pricePerDay = planType === "personal" ? 8 : 5;
  const uses = Array.isArray(body.uses)
    ? body.uses.map(String).filter(Boolean)
    : [];

  return {
    name: String(body.name || "").trim(),
    number: String(body.number || "").trim(),
    email: String(body.email || "").trim(),
    deviceName: String(body.deviceName || "").trim(),
    planType,
    days: Math.min(365, Math.max(1, days || 1)),
    pricePerDay,
    totalBalance: Math.min(365, Math.max(1, days || 1)) * pricePerDay,
    uses,
    payment: body.payment || "No",
    note: String(body.note || "").trim(),
  };
};

const validatePayload = (payload) => {
  if (!payload.name) return "নাম দিতে হবে।";
  if (!mobileRegex.test(payload.number)) {
    return "মোবাইল নাম্বার অবশ্যই ১১ ডিজিট এবং 01 দিয়ে শুরু হতে হবে।";
  }
  if (!payload.email) return "ইমেইল দিতে হবে।";
  if (!payload.deviceName) return "ডিভাইস নাম দিতে হবে।";
  if (!payload.uses.length) return "কমপক্ষে একটি Use নির্বাচন করতে হবে।";

  return "";
};

const canAccessPackage = (user, pkg) => user.role === "admin" || pkg.userId === user.id;

export async function GET(request) {
  const auth = await getAuth(request);

  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { db, user } = auth;
  const enriched = db.packages.map((pkg) => {
    const owner = db.users.find((item) => item.id === pkg.userId);
    return withRemaining({
      ...pkg,
      userName: owner?.name || "Unknown",
      userNumber: owner?.number || "",
    });
  });

  const packages = user.role === "admin"
    ? enriched
    : enriched.filter((pkg) => pkg.userId === user.id);

  return NextResponse.json({ packages });
}

export async function POST(request) {
  const auth = await getAuth(request);

  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const payload = sanitizePackagePayload(body);
  const validationError = validatePayload(payload);

  if (validationError) {
    return NextResponse.json({ message: validationError }, { status: 400 });
  }

  const now = new Date().toISOString();
  let userId = auth.user.id;

  if (auth.user.role === "admin") {
    let owner = auth.db.users.find((item) => item.number === payload.number);

    if (!owner) {
      owner = {
        id: uid("user"),
        name: payload.name,
        number: payload.number,
        role: adminNumbers().includes(payload.number) ? "admin" : "user",
        createdAt: now,
        updatedAt: now,
      };
      auth.db.users.push(owner);
    } else {
      owner.name = payload.name || owner.name;
      owner.updatedAt = now;
    }

    userId = owner.id;
  }

  const pkg = {
    id: uid("pkg"),
    userId,
    ...payload,
    createdAt: now,
    updatedAt: now,
  };

  auth.db.packages.unshift(pkg);
  await writeDb(auth.db);

  return NextResponse.json({ package: withRemaining(pkg) }, { status: 201 });
}

export async function PATCH(request) {
  const auth = await getAuth(request);

  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const body = await request.json();
  const payload = sanitizePackagePayload(body);
  const validationError = validatePayload(payload);

  if (validationError) {
    return NextResponse.json({ message: validationError }, { status: 400 });
  }

  const pkgIndex = auth.db.packages.findIndex((item) => item.id === id);
  const pkg = auth.db.packages[pkgIndex];

  if (!pkg || !canAccessPackage(auth.user, pkg)) {
    return NextResponse.json({ message: "প্যাকেজ পাওয়া যায়নি।" }, { status: 404 });
  }

  if (auth.user.role !== "admin" && auth.db.settings.editMode === "review") {
    const review = {
      id: uid("review"),
      type: "edit",
      status: "pending",
      packageId: id,
      userId: auth.user.id,
      payload,
      before: pkg,
      requestedAt: new Date().toISOString(),
    };

    auth.db.reviews.unshift(review);
    await writeDb(auth.db);

    return NextResponse.json({ reviewRequired: true, review });
  }

  const updated = {
    ...pkg,
    ...payload,
    updatedAt: new Date().toISOString(),
  };

  auth.db.packages[pkgIndex] = updated;
  await writeDb(auth.db);

  return NextResponse.json({ package: withRemaining(updated) });
}

export async function DELETE(request) {
  const auth = await getAuth(request);

  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const pkgIndex = auth.db.packages.findIndex((item) => item.id === id);
  const pkg = auth.db.packages[pkgIndex];

  if (!pkg || !canAccessPackage(auth.user, pkg)) {
    return NextResponse.json({ message: "প্যাকেজ পাওয়া যায়নি।" }, { status: 404 });
  }

  if (auth.user.role !== "admin" && auth.db.settings.deleteMode === "review") {
    const review = {
      id: uid("review"),
      type: "delete",
      status: "pending",
      packageId: id,
      userId: auth.user.id,
      payload: null,
      before: pkg,
      requestedAt: new Date().toISOString(),
    };

    auth.db.reviews.unshift(review);
    await writeDb(auth.db);

    return NextResponse.json({ reviewRequired: true, review });
  }

  auth.db.packages.splice(pkgIndex, 1);
  await writeDb(auth.db);

  return NextResponse.json({ deleted: true });
}
