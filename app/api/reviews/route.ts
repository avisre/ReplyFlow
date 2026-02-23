import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { fetchUnansweredReviewsFromGoogle, getDemoReviews } from "@/lib/google";
import Review from "@/models/Review";
import User from "@/models/User";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const syncedReviews = await fetchUnansweredReviewsFromGoogle(user.googleAccessToken);
    const incomingReviews = syncedReviews.length > 0 ? syncedReviews : getDemoReviews();

    await Promise.all(
      incomingReviews.map(async (review) => {
        await Review.findOneAndUpdate(
          {
            userId: user._id,
            reviewId: review.reviewId,
          },
          {
            $set: {
              reviewerName: review.reviewerName,
              rating: review.rating,
              reviewText: review.reviewText,
            },
            $setOnInsert: {
              status: "pending",
              createdAt: review.createdAt,
            },
          },
          {
            upsert: true,
            new: true,
          },
        );
      }),
    );

    const reviews = await Review.find({ userId: user._id }).sort({ createdAt: -1 }).lean();

    const serialized = reviews.map((review) => ({
      ...review,
      _id: review._id.toString(),
      userId: review.userId.toString(),
      createdAt: new Date(review.createdAt).toISOString(),
      postedAt: review.postedAt ? new Date(review.postedAt).toISOString() : null,
    }));

    return NextResponse.json({ reviews: serialized });
  } catch (error) {
    console.error("Get reviews failed:", error);
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
}
