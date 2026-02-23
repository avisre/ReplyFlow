import { getOpenAIClient } from "@/lib/openai";

export const REPLY_SYSTEM_PROMPT = `You are a professional, warm, and friendly business owner responding to a Google review. Write a genuine, human-sounding reply in under 100 words. Match the tone to the star rating: enthusiastic and grateful for 4-5 stars, empathetic and solution-focused for 1-3 stars. Never sound corporate or robotic. Never mention you are AI. Use the reviewer's first name if available.`;

export async function generateReplyText({
  reviewerName,
  rating,
  reviewText,
}: {
  reviewerName: string;
  rating: number;
  reviewText: string;
}) {
  const openai = getOpenAIClient();
  const firstName = reviewerName.split(" ")[0] ?? "there";

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.7,
    max_tokens: 180,
    messages: [
      {
        role: "system",
        content: REPLY_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: `Reviewer first name: ${firstName}\nStar rating: ${rating}\nReview text: ${reviewText}`,
      },
    ],
  });

  return completion.choices[0]?.message?.content?.trim() ?? "";
}
