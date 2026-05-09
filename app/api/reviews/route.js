import { NextResponse } from "next/server";
import { getAuth, withRemaining, writeDb } from "@/lib/db";

export const runtime = "nodejs";

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
        auth.db.packages[pkgIndex] = {
          ...auth.db.packages[pkgIndex],
          ...review.payload,
          updatedAt: new Date().toISOString(),
        };
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
