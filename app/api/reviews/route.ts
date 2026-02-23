import { authOptions } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";
import { connectToDatabase } from "@/lib/db";
import { sendNewReviewAlertEmail } from "@/lib/email";
import { fetchUnansweredReviewsFromGoogle, getDemoReviews, postReplyToGoogle } from "@/lib/google";
import { generateReplyText } from "@/lib/reply";
import Review from "@/models/Review";
import User from "@/models/User";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function serializeReview(review: {
  _id: { toString(): string };
  userId: { toString(): string };
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
    userId: review.userId.toString(),
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

    const accessToken = decryptSecret(user.googleAccessToken);
    const syncedReviews = await fetchUnansweredReviewsFromGoogle(accessToken);
    const incomingReviews = syncedReviews.length > 0 ? syncedReviews : getDemoReviews();
    const newReviewIds: string[] = [];

    for (const review of incomingReviews) {
      const existingReview = await Review.findOne({
        userId: user._id,
        reviewId: review.reviewId,
      });

      if (existingReview) {
        existingReview.reviewerName = review.reviewerName;
        existingReview.rating = review.rating;
        existingReview.reviewText = review.reviewText;
        existingReview.locationId = review.locationId;
        existingReview.locationName = review.locationName;
        await existingReview.save();
        continue;
      }

      const createdReview = await Review.create({
        userId: user._id,
        reviewId: review.reviewId,
        reviewerName: review.reviewerName,
        rating: review.rating,
        reviewText: review.reviewText,
        locationId: review.locationId,
        locationName: review.locationName,
        status: "pending",
        createdAt: review.createdAt,
      });

      newReviewIds.push(createdReview._id.toString());
    }

    if (user.autoPostReplies) {
      const pendingReviews = await Review.find({
        userId: user._id,
        status: "pending",
      })
        .sort({ createdAt: 1 })
        .limit(25);

      for (const pendingReview of pendingReviews) {
        try {
          const generatedReply = await generateReplyText({
            reviewerName: pendingReview.reviewerName,
            rating: pendingReview.rating,
            reviewText: pendingReview.reviewText,
          });

          if (!generatedReply) {
            continue;
          }

          pendingReview.generatedReply = generatedReply;
          pendingReview.status = "generated";

          const postResult = await postReplyToGoogle({
            accessToken,
            reviewId: pendingReview.reviewId,
            replyText: generatedReply,
          });

          if (postResult.posted) {
            pendingReview.status = "posted";
            pendingReview.postedAt = new Date();
          }

          await pendingReview.save();
        } catch (error) {
          console.error(`Auto-post flow failed for review ${pendingReview.reviewId}:`, error);
        }
      }
    }

    if (user.newReviewAlertsEnabled) {
      const destinationEmail = user.alertEmail ?? user.email;
      if (destinationEmail) {
        const unsentAlerts = await Review.find({
          userId: user._id,
          alertSentAt: null,
        })
          .sort({ createdAt: -1 })
          .limit(20);

        for (const review of unsentAlerts) {
          try {
            const result = await sendNewReviewAlertEmail({
              to: destinationEmail,
              businessName: user.name ?? "ReplyFlow Business",
              reviewerName: review.reviewerName,
              rating: review.rating,
              reviewText: review.reviewText,
              locationName: review.locationName ?? "Primary Location",
            });

            if (result.sent) {
              review.alertSentAt = new Date();
              await review.save();
            }
          } catch (error) {
            console.error(`New review alert failed for ${review.reviewId}:`, error);
          }
        }
      }
    }

    const reviews = await Review.find({ userId: user._id }).sort({ createdAt: -1 }).lean();
    const serialized = reviews.map(serializeReview);

    return NextResponse.json({
      reviews: serialized,
      syncedNewReviews: newReviewIds.length,
    });
  } catch (error) {
    console.error("Get reviews failed:", error);
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
}
