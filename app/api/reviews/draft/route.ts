import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import Review from "@/models/Review";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type DraftRequestBody = {
  reviewId?: string;
  action?: "delete";
};

function serializeReview(review: {
  _id: { toString(): string };
  reviewId: string;
  reviewerName: string;
  rating: number;
  reviewText: string;
  generatedReply: string;
  status: "pending" | "generated" | "posted";
  postedAt: Date | null;
  createdAt: Date;
  locationId?: string | null;
  locationName?: string | null;
}) {
  return {
    _id: review._id.toString(),
    reviewId: review.reviewId,
    reviewerName: review.reviewerName,
    rating: review.rating,
    reviewText: review.reviewText,
    generatedReply: review.generatedReply,
    status: review.status,
    postedAt: review.postedAt ? new Date(review.postedAt).toISOString() : null,
    createdAt: new Date(review.createdAt).toISOString(),
    locationId: review.locationId ?? null,
    locationName: review.locationName ?? "Primary Location",
  };
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as DraftRequestBody;
    if (!body.reviewId) {
      return NextResponse.json({ error: "reviewId is required" }, { status: 400 });
    }

    if (body.action !== "delete") {
      return NextResponse.json({ error: "Unsupported draft action" }, { status: 400 });
    }

    await connectToDatabase();

    const review = await Review.findOne({
      _id: body.reviewId,
      userId: session.user.id,
    });

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    if (review.status === "posted") {
      return NextResponse.json(
        { error: "Posted replies cannot be deleted from draft state." },
        { status: 400 },
      );
    }

    review.generatedReply = "";
    review.status = "pending";
    review.postedAt = null;
    await review.save();

    return NextResponse.json({
      review: serializeReview(review),
      message: "Draft deleted successfully.",
    });
  } catch (error) {
    console.error("Draft update failed:", error);
    return NextResponse.json({ error: "Failed to update draft" }, { status: 500 });
  }
}
