import { authOptions } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";
import { connectToDatabase } from "@/lib/db";
import { postReplyToGoogle } from "@/lib/google";
import { ReplyGenerationError, generateReplyOptions } from "@/lib/reply";
import Review from "@/models/Review";
import User from "@/models/User";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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

    const body = (await request.json()) as { reviewId?: string };
    if (!body.reviewId) {
      return NextResponse.json({ error: "reviewId is required" }, { status: 400 });
    }

    await connectToDatabase();

    const [review, user] = await Promise.all([
      Review.findOne({
        _id: body.reviewId,
        userId: session.user.id,
      }),
      User.findById(session.user.id).select("googleAccessToken autoPostReplies"),
    ]);

    if (!review || !user) {
      return NextResponse.json({ error: "Review or user not found" }, { status: 404 });
    }

    const generatedOptions = await generateReplyOptions({
      reviewerName: review.reviewerName,
      rating: review.rating,
      reviewText: review.reviewText,
    });
    const generatedReply = generatedOptions[0]?.text ?? "";

    if (!generatedReply) {
      return NextResponse.json({ error: "Failed to generate reply" }, { status: 500 });
    }

    review.generatedReply = generatedReply;
    review.status = "generated";
    review.postedAt = null;

    let autoPosted = false;
    let autoPostWarning: string | null = null;

    if (user.autoPostReplies) {
      try {
        const googleResult = await postReplyToGoogle({
          accessToken: decryptSecret(user.googleAccessToken),
          reviewId: review.reviewId,
          replyText: generatedReply,
        });

        if (googleResult.posted) {
          review.status = "posted";
          review.postedAt = new Date();
          autoPosted = true;
        } else {
          autoPostWarning = googleResult.reason ?? "Auto-posting was skipped.";
        }
      } catch (error) {
        console.error("Auto-post on generation failed:", error);
        autoPostWarning = "Auto-posting failed. You can still post it manually.";
      }
    }

    await review.save();

    return NextResponse.json({
      review: serializeReview(review),
      options: generatedOptions,
      autoPosted,
      warning: autoPostWarning,
    });
  } catch (error) {
    console.error("Generate reply failed:", error);

    if (error instanceof ReplyGenerationError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code ?? "reply_generation_error",
        },
        { status: error.status },
      );
    }

    return NextResponse.json({ error: "Unable to generate AI reply" }, { status: 500 });
  }
}
