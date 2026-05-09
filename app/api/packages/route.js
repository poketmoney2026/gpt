import { NextResponse } from "next/server";
import { adminNumbers, getAuth, mobileRegex, uid, withRemaining, writeDb } from "@/lib/db";

export const runtime = "nodejs";

const allowedPlans = ["share", "personal", "version-one", "version-two"];
const allowedPayments = ["unpaid", "paid", "pending"];
const dayMs = 24 * 60 * 60 * 1000;

const priceByPlan = {
  share: 5,
  personal: 8,
  "version-one": 5,
  "version-two": 8,
};

const sanitizePackagePayload = (body) => {
  const days = Number(body.days || 0);
  const planType = allowedPlans.includes(body.planType) ? body.planType : "share";
  const pricePerDay = Number(body.pricePerDay || priceByPlan[planType] || 5);
  const safeDays = Math.min(365, Math.max(1, days || 1));
  const uses = Array.isArray(body.uses) ? body.uses.map(String).filter(Boolean) : [];
  const paymentStatus = allowedPayments.includes(body.paymentStatus)
    ? body.paymentStatus
    : allowedPayments.includes(body.payment)
      ? body.payment
      : "unpaid";

  return {
    name: String(body.name || "").trim(),
    number: String(body.number || "").trim(),
    email: String(body.email || "").trim(),
    deviceName: String(body.deviceName || "").trim(),
    planType,
    days: safeDays,
    pricePerDay,
    totalBalance: safeDays * pricePerDay,
    uses,
    paymentStatus,
    payment: paymentStatus,
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

const planLabel = (planType) => {
  if (planType === "version-one") return "Version One";
  if (planType === "version-two") return "Version Two";
  if (planType === "personal") return "Personal";
  return "Share";
};

const buildPackageUpdate = (previous, payload) => {
  const startedAt = previous.startedAt || previous.purchasedAt || previous.createdAt || new Date().toISOString();
  const endsAt = new Date(new Date(startedAt).getTime() + Number(payload.days || 0) * dayMs).toISOString();

  return {
    ...previous,
    ...payload,
    planName: planLabel(payload.planType),
    startedAt,
    endsAt,
    endAt: endsAt,
    updatedAt: new Date().toISOString(),
  };
};

const updateOwnerFromPackage = (db, owner, payload) => {
  owner.name = payload.name || owner.name;
  owner.email = payload.email || owner.email || "";
  owner.deviceName = payload.deviceName || owner.deviceName || "";
  owner.updatedAt = new Date().toISOString();

  const ownerIndex = db.users.findIndex((item) => item.id === owner.id);
  if (ownerIndex >= 0) db.users[ownerIndex] = owner;
};

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
      userEmail: owner?.email || "",
    });
  });

  const packages = user.role === "admin" ? enriched : enriched.filter((pkg) => pkg.userId === user.id);

  return NextResponse.json({ packages });
}

export async function POST(request) {
  const auth = await getAuth(request);

  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  let payload = sanitizePackagePayload(body);

  if (auth.user.role !== "admin") {
    payload = { ...payload, number: auth.user.number };
  }

  const validationError = validatePayload(payload);

  if (validationError) {
    return NextResponse.json({ message: validationError }, { status: 400 });
  }

  const now = new Date().toISOString();
  let owner = auth.user;

  if (auth.user.role === "admin") {
    owner = auth.db.users.find((item) => item.number === payload.number);

    if (!owner) {
      owner = {
        id: uid("user"),
        name: payload.name,
        number: payload.number,
        email: payload.email,
        deviceName: payload.deviceName,
        role: adminNumbers().includes(payload.number) ? "admin" : "user",
        createdAt: now,
        updatedAt: now,
      };
      auth.db.users.push(owner);
    } else {
      updateOwnerFromPackage(auth.db, owner, payload);
    }
  } else {
    updateOwnerFromPackage(auth.db, owner, payload);
  }

  const endsAt = new Date(new Date(now).getTime() + Number(payload.days || 0) * dayMs).toISOString();
  const pkg = {
    id: uid("pkg"),
    userId: owner.id,
    ...payload,
    planName: planLabel(payload.planType),
    purchasedAt: now,
    startedAt: now,
    endsAt,
    endAt: endsAt,
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
  let payload = sanitizePackagePayload(body);

  const pkgIndex = auth.db.packages.findIndex((item) => item.id === id);
  const pkg = auth.db.packages[pkgIndex];

  if (!pkg || !canAccessPackage(auth.user, pkg)) {
    return NextResponse.json({ message: "প্যাকেজ পাওয়া যায়নি।" }, { status: 404 });
  }

  if (auth.user.role !== "admin") {
    payload = { ...payload, number: auth.user.number, paymentStatus: pkg.paymentStatus || "unpaid", payment: pkg.paymentStatus || "unpaid" };
  }

  const validationError = validatePayload(payload);

  if (validationError) {
    return NextResponse.json({ message: validationError }, { status: 400 });
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

  const updated = buildPackageUpdate(pkg, payload);
  auth.db.packages[pkgIndex] = updated;

  const owner = auth.db.users.find((item) => item.id === updated.userId);
  if (owner) updateOwnerFromPackage(auth.db, owner, payload);

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
