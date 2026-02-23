import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { getOpenAIClient } from "@/lib/openai";
import Review from "@/models/Review";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are a professional, warm, and friendly business owner responding to a Google review. Write a genuine, human-sounding reply in under 100 words. Match the tone to the star rating: enthusiastic and grateful for 4-5 stars, empathetic and solution-focused for 1-3 stars. Never sound corporate or robotic. Never mention you are AI. Use the reviewer's first name if available.`;

export const dynamic = "force-dynamic";

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

    const review = await Review.findOne({
      _id: body.reviewId,
      userId: session.user.id,
    });

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    const openai = getOpenAIClient();
    const firstName = review.reviewerName.split(" ")[0] ?? "there";

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.7,
      max_tokens: 180,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: `Reviewer first name: ${firstName}\nStar rating: ${review.rating}\nReview text: ${review.reviewText}`,
        },
      ],
    });

    const generatedReply = completion.choices[0]?.message?.content?.trim();

    if (!generatedReply) {
      return NextResponse.json({ error: "Failed to generate reply" }, { status: 500 });
    }

    review.generatedReply = generatedReply;
    review.status = "generated";
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
    });
  } catch (error) {
    console.error("Generate reply failed:", error);
    return NextResponse.json({ error: "Unable to generate AI reply" }, { status: 500 });
  }
}
