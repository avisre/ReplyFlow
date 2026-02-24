import { ReplyGenerationError, generateReplyOptions } from "@/lib/reply";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type DummyReplyRequest = {
  reviewerName?: string;
  rating?: number;
  reviewText?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DummyReplyRequest;
    const reviewerName = body.reviewerName?.trim() || "Customer";
    const rating = Number(body.rating);
    const reviewText = body.reviewText?.trim();

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be a number between 1 and 5." },
        { status: 400 },
      );
    }

    if (!reviewText) {
      return NextResponse.json({ error: "Review text is required." }, { status: 400 });
    }

    const options = await generateReplyOptions({
      reviewerName,
      rating,
      reviewText,
    });
    const firstReply = options[0]?.text ?? "";

    if (!firstReply) {
      return NextResponse.json({ error: "No reply was generated." }, { status: 500 });
    }

    return NextResponse.json({
      generatedReply: firstReply,
      options,
    });
  } catch (error) {
    console.error("Dummy reply generation failed:", error);

    if (error instanceof ReplyGenerationError) {
      return NextResponse.json(
        { error: error.message, code: error.code ?? "reply_generation_error" },
        { status: error.status },
      );
    }

    return NextResponse.json({ error: "Failed to generate Gemini reply." }, { status: 500 });
  }
}
