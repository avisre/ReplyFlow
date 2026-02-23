import { getAIProvider, getOpenAIClient } from "@/lib/openai";

export const REPLY_SYSTEM_PROMPT = `You are a professional, warm, and friendly business owner responding to a Google review. Write a genuine, human-sounding reply in under 100 words. Match the tone to the star rating: enthusiastic and grateful for 4-5 stars, empathetic and solution-focused for 1-3 stars. Never sound corporate or robotic. Never mention you are AI. Use the reviewer's first name if available.`;

export class ReplyGenerationError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status = 500, code?: string) {
    super(message);
    this.name = "ReplyGenerationError";
    this.status = status;
    this.code = code;
  }
}

function normalizeOpenAIError(error: unknown) {
  const provider = getAIProvider();
  const providerName = provider === "gemini" ? "Gemini" : "OpenAI";
  const apiKeyName = provider === "gemini" ? "GEMINI_API_KEY" : "OPENAI_API_KEY";
  const status = typeof error === "object" && error && "status" in error
    ? Number((error as { status?: number }).status)
    : 500;
  const payload = typeof error === "object" && error && "error" in error
    ? (error as { error?: { code?: string; type?: string } }).error
    : undefined;
  const code = payload?.code ?? payload?.type;

  if (code === "insufficient_quota") {
    return new ReplyGenerationError(
      `${providerName} quota exceeded. Add credits or billing, then try again.`,
      429,
      code,
    );
  }

  if (code === "invalid_api_key" || status === 401) {
    return new ReplyGenerationError(
      `${providerName} API key is invalid or missing permissions. Update ${apiKeyName}.`,
      401,
      code,
    );
  }

  if (status === 429) {
    return new ReplyGenerationError(
      `${providerName} rate limit reached. Please retry in a few seconds.`,
      429,
      code,
    );
  }

  if (status === 404 || code === "model_not_found") {
    return new ReplyGenerationError(
      `Configured ${providerName} model is unavailable for this account.`,
      400,
      code,
    );
  }

  return new ReplyGenerationError(`Failed to generate reply with ${providerName}.`, 500, code);
}

function getDefaultModelList() {
  const provider = getAIProvider();

  if (provider === "gemini") {
    return "gemini-2.5-flash,gemini-2.0-flash,gemini-1.5-flash";
  }

  return "gpt-4o,gpt-4o-mini";
}

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
  const models = (
    process.env.AI_REPLY_MODELS ??
    process.env.OPENAI_REPLY_MODELS ??
    getDefaultModelList()
  )
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  let lastError: ReplyGenerationError | null = null;

  for (const model of models) {
    try {
      const completion = await openai.chat.completions.create({
        model,
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

      const generated = completion.choices[0]?.message?.content?.trim() ?? "";
      if (generated) {
        return generated;
      }
    } catch (error) {
      const normalized = normalizeOpenAIError(error);
      lastError = normalized;

      // If this model is unavailable, try the next fallback model.
      if (normalized.code === "model_not_found" || normalized.status === 404) {
        continue;
      }

      throw normalized;
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new ReplyGenerationError("AI provider returned an empty reply.", 500, "empty_response");
}
