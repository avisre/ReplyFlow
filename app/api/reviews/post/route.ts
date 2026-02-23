import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { postReplyToGoogle } from "@/lib/google";
import Review from "@/models/Review";
import User from "@/models/User";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      reviewId?: string;
      replyText?: string;
    };

    if (!body.reviewId) {
      return NextResponse.json({ error: "reviewId is required" }, { status: 400 });
    }

    await connectToDatabase();

    const [review, user] = await Promise.all([
      Review.findOne({
        _id: body.reviewId,
        userId: session.user.id,
      }),
      User.findById(session.user.id),
    ]);

    if (!review || !user) {
      return NextResponse.json({ error: "Review or user not found" }, { status: 404 });
    }

    const replyText = body.replyText?.trim() || review.generatedReply;
    if (!replyText) {
      return NextResponse.json({ error: "Reply text cannot be empty" }, { status: 400 });
    }

    const googleResult = await postReplyToGoogle({
      accessToken: user.googleAccessToken,
      reviewId: review.reviewId,
      replyText,
    });

    if (!googleResult.posted) {
      return NextResponse.json(
        {
          error: googleResult.reason ?? "Failed to post reply to Google",
        },
        { status: 400 },
      );
    }

    review.generatedReply = replyText;
    review.status = "posted";
    review.postedAt = new Date();
    await review.save();

    return NextResponse.json({
      review: {
        _id: review._id.toString(),
        reviewId: review.reviewId,
        reviewerName: review.reviewerName,
        rating: review.rating,
        reviewText: review.reviewText,
        generatedReply: review.generatedReply,
        status: review.status,
        postedAt: review.postedAt ? new Date(review.postedAt).toISOString() : null,
        createdAt: new Date(review.createdAt).toISOString(),
      },
      message: "Reply posted successfully.",
    });
  } catch (error) {
    console.error("Post reply failed:", error);
    return NextResponse.json({ error: "Failed to post reply" }, { status: 500 });
  }
}
