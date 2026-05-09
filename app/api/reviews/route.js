import { NextResponse } from "next/server";
import { getAuth, withRemaining, writeDb } from "@/lib/db";

export const runtime = "nodejs";

const dayMs = 24 * 60 * 60 * 1000;

const planLabel = (planType) => {
  if (planType === "version-one") return "Version One";
  if (planType === "version-two") return "Version Two";
  if (planType === "personal") return "Personal";
  return "Share";
};

const applyEditPayload = (pkg, payload) => {
  const startedAt = pkg.startedAt || pkg.purchasedAt || pkg.createdAt || new Date().toISOString();
  const endsAt = new Date(new Date(startedAt).getTime() + Number(payload.days || 0) * dayMs).toISOString();

  return {
    ...pkg,
    ...payload,
    planName: planLabel(payload.planType),
    paymentStatus: payload.paymentStatus || payload.payment || "unpaid",
    payment: payload.paymentStatus || payload.payment || "unpaid",
    startedAt,
    endsAt,
    endAt: endsAt,
    updatedAt: new Date().toISOString(),
  };
};

const syncOwner = (db, pkg, payload) => {
  const ownerIndex = db.users.findIndex((item) => item.id === pkg.userId);
  if (ownerIndex < 0) return;

  db.users[ownerIndex] = {
    ...db.users[ownerIndex],
    name: payload.name || db.users[ownerIndex].name,
    email: payload.email || db.users[ownerIndex].email || "",
    deviceName: payload.deviceName || db.users[ownerIndex].deviceName || "",
    updatedAt: new Date().toISOString(),
  };
};

export async function GET(request) {
  const auth = await getAuth(request);

  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const visibleReviews = auth.user.role === "admin"
    ? auth.db.reviews
    : auth.db.reviews.filter((review) => review.userId === auth.user.id);

  const reviews = visibleReviews.map((review) => {
    const user = auth.db.users.find((item) => item.id === review.userId);
    const pkg = auth.db.packages.find((item) => item.id === review.packageId) || review.before;

    return {
      ...review,
      userName: user?.name || "Unknown",
      userNumber: user?.number || "",
      package: pkg ? withRemaining(pkg) : null,
    };
  });

  return NextResponse.json({ reviews });
}

export async function PATCH(request) {
  const auth = await getAuth(request);

  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (auth.user.role !== "admin") {
    return NextResponse.json({ message: "Only admin can review" }, { status: 403 });
  }

  const body = await request.json();
  const reviewIndex = auth.db.reviews.findIndex((item) => item.id === body.reviewId);
  const review = auth.db.reviews[reviewIndex];

  if (!review) {
    return NextResponse.json({ message: "রিভিউ পাওয়া যায়নি।" }, { status: 404 });
  }

  if (review.status !== "pending") {
    return NextResponse.json({ message: "এই রিভিউ আগে থেকেই প্রসেস করা হয়েছে।" }, { status: 400 });
  }

  if (body.action === "approve") {
    if (review.type === "edit") {
      const pkgIndex = auth.db.packages.findIndex((item) => item.id === review.packageId);

      if (pkgIndex >= 0) {
        const updated = applyEditPayload(auth.db.packages[pkgIndex], review.payload);
        auth.db.packages[pkgIndex] = updated;
        syncOwner(auth.db, updated, review.payload);
      }
    }

    if (review.type === "delete") {
      auth.db.packages = auth.db.packages.filter((item) => item.id !== review.packageId);
    }

    review.status = "approved";
  } else {
    review.status = "rejected";
  }

  review.reviewedAt = new Date().toISOString();
  review.reviewedBy = auth.user.id;
  auth.db.reviews[reviewIndex] = review;
  await writeDb(auth.db);

  return NextResponse.json({ review });
}
