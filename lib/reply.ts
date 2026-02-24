export const REPLY_SYSTEM_PROMPT = `You are a professional, warm, and friendly business owner responding to a Google review. Write genuine, human-sounding replies in under 100 words. Match the tone to the star rating: enthusiastic and grateful for 4-5 stars, empathetic and solution-focused for 1-3 stars. Never sound corporate or robotic. Never mention you are AI. Use the reviewer's first name if available. Never include phone numbers, email addresses, website URLs, social handles, physical addresses, or directions. Do not ask users to call/email/visit a specific contact channel. If help is needed, use this exact line: "If you need any help or have any questions, please reach out."`;

type GeminiApiError = {
  code?: number | string;
  message?: string;
  status?: string;
};

type GeminiPart = {
  text?: string;
};

type GeminiCandidate = {
  finishReason?: string;
  content?: {
    parts?: GeminiPart[];
  };
};

type GeminiGenerateResponse = {
  candidates?: GeminiCandidate[];
  usageMetadata?: {
    candidatesTokenCount?: number;
  };
  error?: GeminiApiError;
};

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

type GeminiResult = {
  text: string;
  finishReason: string;
  outputTokens: number;
};

export type ReplyOption = {
  key: "quick_pro" | "warm_personal" | "growth_recovery";
  label: string;
  text: string;
  wordCount: number;
};

const DEFAULT_MODEL_LIST = "gemini-2.5-flash,gemini-2.0-flash,gemini-2.0-flash-lite";
const DEFAULT_TIMEOUT_MS = 12000;
const DEFAULT_MAX_ATTEMPTS = 1;

function getGeminiApiBase() {
  const raw = process.env.GEMINI_API_BASE?.trim() || process.env.GEMINI_BASE_URL?.trim();
  if (!raw) {
    return "https://generativelanguage.googleapis.com/v1beta";
  }

  const normalized = raw.replace(/\/+$/, "");
  if (normalized.endsWith("/openai")) {
    return normalized.slice(0, -"/openai".length);
  }

  return normalized;
}

function getModelList() {
  const configured = process.env.AI_REPLY_MODELS ?? process.env.GEMINI_REPLY_MODELS ?? DEFAULT_MODEL_LIST;
  return configured
    .split(",")
    .map((value) => value.trim().replace(/^models\//, ""))
    .filter(Boolean);
}

function getTimeoutMs() {
  const configured = Number(process.env.AI_REPLY_TIMEOUT_MS ?? "");
  if (Number.isFinite(configured) && configured >= 2000) {
    return configured;
  }

  return DEFAULT_TIMEOUT_MS;
}

function getMaxAttempts() {
  const configured = Number(process.env.AI_REPLY_MAX_ATTEMPTS ?? "");
  if (Number.isFinite(configured) && configured >= 1 && configured <= 3) {
    return Math.floor(configured);
  }

  return DEFAULT_MAX_ATTEMPTS;
}

function normalizeGeminiError(error: unknown) {
  const status = typeof error === "object" && error && "status" in error
    ? Number((error as { status?: number }).status)
    : 500;
  const code = typeof error === "object" && error && "code" in error
    ? String((error as { code?: string | number }).code ?? "")
    : "";
  const message = typeof error === "object" && error && "message" in error
    ? String((error as { message?: string }).message ?? "")
    : "";
  const causeCode = typeof error === "object" && error && "cause" in error
    ? String(
      (
        error as {
          cause?: { code?: string | number };
        }
      ).cause?.code ?? "",
    )
    : "";
  const normalizedCode = code || undefined;

  if (
    message === "fetch failed" ||
    ["ENOTFOUND", "ECONNREFUSED", "ETIMEDOUT", "EHOSTUNREACH"].includes(causeCode)
  ) {
    return new ReplyGenerationError(
      "Unable to reach AI gateway. Verify GEMINI_BASE_URL and ensure your tunnel/server is online.",
      502,
      "gateway_unreachable",
    );
  }

  if (
    normalizedCode === "RESOURCE_EXHAUSTED" ||
    normalizedCode === "insufficient_quota"
  ) {
    return new ReplyGenerationError(
      "Gemini quota exceeded. Check Google AI Studio usage/billing, then retry.",
      429,
      normalizedCode,
    );
  }

  if (status === 401 || status === 403 || normalizedCode === "PERMISSION_DENIED") {
    return new ReplyGenerationError(
      "Gemini API key is invalid or missing permissions. Update GEMINI_API_KEY.",
      status === 403 ? 403 : 401,
      normalizedCode,
    );
  }

  if (status === 429) {
    return new ReplyGenerationError(
      "Gemini rate limit reached. Please retry in a few seconds.",
      429,
      normalizedCode,
    );
  }

  if (status === 404 || normalizedCode === "NOT_FOUND") {
    return new ReplyGenerationError(
      "Configured Gemini model is unavailable for this account.",
      400,
      normalizedCode,
    );
  }

  if (normalizedCode === "timeout") {
    return new ReplyGenerationError(
      "AI generation timed out. Please try again.",
      504,
      normalizedCode,
    );
  }

  if (normalizedCode === "invalid_response") {
    return new ReplyGenerationError(
      "AI gateway returned an invalid response. Verify GEMINI_BASE_URL and tunnel health.",
      status || 502,
      normalizedCode,
    );
  }

  return new ReplyGenerationError(
    message || "Failed to generate reply with Gemini.",
    status || 500,
    normalizedCode,
  );
}

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function endsWithSentence(text: string) {
  return /[.!?]["']?$/.test(text.trim());
}

function isLikelyIncompleteReply(text: string) {
  const cleaned = text.trim();
  if (!cleaned) {
    return true;
  }

  const words = countWords(cleaned);
  if (words < 14) {
    return true;
  }

  if (!endsWithSentence(cleaned)) {
    return true;
  }

  if (/\b(and|or|to|for|with|because|so|that|if|but)\s*$/i.test(cleaned)) {
    return true;
  }

  return false;
}

function sanitizeReply(text: string) {
  const withoutContacts = text
    .replace(/\[Your Business Name\]\s*Team/gi, "our team")
    .replace(/\[Your Business Name\]/gi, "our business")
    .replace(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, "")
    .replace(/\bhttps?:\/\/\S+\b/gi, "")
    .replace(/\bwww\.\S+\b/gi, "")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "")
    .replace(/\b(call|text|email|dm|message)\s+(us|me)\b[^.!?]*[.!?]?/gi, "If you need any help or have any questions, please reach out.")
    .replace(/\b(contact\s+us\s+directly)\b[^.!?]*[.!?]?/gi, "If you need any help or have any questions, please reach out.")
    .replace(/\b(reach\s+us\s+at)\b[^.!?]*[.!?]?/gi, "If you need any help or have any questions, please reach out.")
    .replace(/\b(visit|stop by)\s+(us|our)\s+(at|on)\b[^.!?]*[.!?]?/gi, "If you need any help or have any questions, please reach out.")
    .replace(/\s+/g, " ")
    .trim();

  return withoutContacts;
}

function ensureSentence(text: string) {
  const cleaned = sanitizeReply(text);
  if (!cleaned) {
    return "";
  }

  return endsWithSentence(cleaned) ? cleaned : `${cleaned}.`;
}

function trimWords(text: string, maxWords: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return ensureSentence(text);
  }

  return ensureSentence(words.slice(0, maxWords).join(" "));
}

function buildSingleReplyPrompt({
  reviewerName,
  rating,
  reviewText,
}: {
  reviewerName: string;
  rating: number;
  reviewText: string;
}) {
  const firstName = reviewerName.split(" ")[0] ?? "there";

  return [
    `Reviewer first name: ${firstName}`,
    `Star rating: ${rating}`,
    `Review text: ${reviewText}`,
    "Reply requirements:",
    "- 35 to 90 words",
    "- Natural, specific, and complete",
    "- Professional and friendly",
    "- Do not include placeholders",
    "- Never include phone, email, URL, social, or address details",
    "- Never ask them to contact a specific channel",
    '- If help is needed, use exactly: "If you need any help or have any questions, please reach out."',
    "- One paragraph only",
    "- End with a complete sentence and punctuation",
  ].join("\n");
}

function dedupeOptions(options: string[]) {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const option of options) {
    const normalized = option.toLowerCase();
    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    deduped.push(option);
  }

  return deduped;
}

function buildFallbackOptionSet(baseReply: string, rating: number) {
  const base = ensureSentence(baseReply);
  const personalDetailClose = "Thanks again for sharing this feedback with us.";
  const positiveClose =
    "We would love to welcome you back soon, and referrals from customers like you mean a lot to us.";
  const recoveryClose =
    "If you need any help or have any questions, please reach out.";

  const quickPro = trimWords(base, 40);
  const warmPersonal = trimWords(ensureSentence(`${base} ${personalDetailClose}`), 75);
  const growthSuffix = rating >= 4 ? positiveClose : recoveryClose;
  const growthRecovery = trimWords(ensureSentence(`${warmPersonal} ${growthSuffix}`), 95);

  return [quickPro, warmPersonal, growthRecovery];
}

function normalizeToThreeOptions(options: string[], rating: number) {
  const cleaned = dedupeOptions(
    options
      .map((option) => ensureSentence(option))
      .filter((option) => !isLikelyIncompleteReply(option)),
  );

  if (cleaned.length >= 3) {
    return cleaned.slice(0, 3);
  }

  const seed = cleaned[0];
  if (!seed) {
    return [] as string[];
  }

  const fallback = buildFallbackOptionSet(seed, rating);
  for (const item of fallback) {
    if (cleaned.length >= 3) {
      break;
    }

    if (!cleaned.some((existing) => existing.toLowerCase() === item.toLowerCase())) {
      cleaned.push(item);
    }
  }

  return cleaned.slice(0, 3);
}

function toReplyOptions(options: string[]): ReplyOption[] {
  const labels: Array<ReplyOption["label"]> = [
    "Quick Pro",
    "Warm Personal",
    "Growth/Recovery",
  ];
  const keys: Array<ReplyOption["key"]> = ["quick_pro", "warm_personal", "growth_recovery"];

  return options.slice(0, 3).map((text, index) => ({
    key: keys[index] ?? "warm_personal",
    label: labels[index] ?? `Professional Option ${index + 1}`,
    text,
    wordCount: countWords(text),
  }));
}

async function generateWithGemini({
  model,
  userPrompt,
  maxOutputTokens,
  temperature,
}: {
  model: string;
  userPrompt: string;
  maxOutputTokens: number;
  temperature: number;
}): Promise<GeminiResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new ReplyGenerationError("GEMINI_API_KEY is missing.", 500, "missing_api_key");
  }

  const baseUrl = getGeminiApiBase();
  const url = `${baseUrl}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const payload = {
    systemInstruction: {
      parts: [{ text: REPLY_SYSTEM_PROMPT }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: userPrompt }],
      },
    ],
    generationConfig: {
      temperature,
      maxOutputTokens,
      responseMimeType: "text/plain",
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, getTimeoutMs());

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const rawBody = await response.text();
    let data: GeminiGenerateResponse = {};
    try {
      data = rawBody ? (JSON.parse(rawBody) as GeminiGenerateResponse) : {};
    } catch {
      const err = new Error(
        response.ok
          ? "AI provider returned a non-JSON response."
          : `AI provider returned an unexpected response (HTTP ${response.status}).`,
      ) as Error & {
        status?: number;
        code?: string;
      };
      err.status = response.status || 502;
      err.code = "invalid_response";
      throw err;
    }

    if (!response.ok) {
      const err = new Error(data.error?.message ?? `Gemini request failed with ${response.status}`) as Error & {
        status?: number;
        code?: string | number;
      };
      err.status = response.status;
      err.code = data.error?.status ?? data.error?.code;
      throw err;
    }

    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.map((part) => part.text ?? "").join("").trim() ?? "";

    return {
      text,
      finishReason: candidate?.finishReason ?? "UNKNOWN",
      outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
    };
  } catch (error) {
    if (controller.signal.aborted || (error instanceof Error && error.name === "AbortError")) {
      const timeoutError = new Error("Gemini request timed out") as Error & {
        status?: number;
        code?: string;
      };
      timeoutError.status = 504;
      timeoutError.code = "timeout";
      throw timeoutError;
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function shouldBreakModelLoop(error: ReplyGenerationError) {
  return (
    error.status === 400 ||
    error.status === 404 ||
    error.code === "NOT_FOUND" ||
    error.code === "model_not_found"
  );
}

export async function generateReplyOptions({
  reviewerName,
  rating,
  reviewText,
}: {
  reviewerName: string;
  rating: number;
  reviewText: string;
}) {
  // Reliability-first path:
  // generate one high-quality base reply, then derive the 3 UX options locally.
  // This avoids model-specific failures on large structured multi-option prompts.
  const baseReply = await generateReplyText({ reviewerName, rating, reviewText });
  const orderedOptions = buildFallbackOptionSet(baseReply, rating);
  const uniqueOrdered: string[] = [];

  for (const option of orderedOptions) {
    const normalized = ensureSentence(option);
    if (!normalized) {
      continue;
    }

    if (!uniqueOrdered.some((existing) => existing.toLowerCase() === normalized.toLowerCase())) {
      uniqueOrdered.push(normalized);
    }
  }

  if (uniqueOrdered.length < 3) {
    const fallbackPool = normalizeToThreeOptions([baseReply], rating);
    for (const option of fallbackPool) {
      if (uniqueOrdered.length >= 3) {
        break;
      }

      if (!uniqueOrdered.some((existing) => existing.toLowerCase() === option.toLowerCase())) {
        uniqueOrdered.push(option);
      }
    }
  }

  if (uniqueOrdered.length > 0) {
    return toReplyOptions(uniqueOrdered.slice(0, 3));
  }

  throw new ReplyGenerationError("Gemini returned an empty reply.", 500, "empty_response");
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
  const models = getModelList();
  const maxAttempts = getMaxAttempts();
  let bestCandidate = "";
  let lastError: ReplyGenerationError | null = null;
  let rateLimitError: ReplyGenerationError | null = null;

  for (const model of models) {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const result = await generateWithGemini({
          model,
          userPrompt: buildSingleReplyPrompt({ reviewerName, rating, reviewText }),
          maxOutputTokens: attempt === 1 ? 140 : 200,
          temperature: 0.62,
        });

        const cleaned = ensureSentence(result.text);
        if (cleaned.length > bestCandidate.length) {
          bestCandidate = cleaned;
        }

        const incomplete =
          result.finishReason === "MAX_TOKENS" || isLikelyIncompleteReply(cleaned);

        if (!incomplete) {
          return cleaned;
        }
      } catch (error) {
        const normalized = normalizeGeminiError(error);
        lastError = normalized;

        if (
          normalized.code === "gateway_unreachable" ||
          normalized.code === "missing_api_key"
        ) {
          throw normalized;
        }

        if (shouldBreakModelLoop(normalized)) {
          break;
        }

        if (normalized.status === 429 && attempt === 1) {
          continue;
        }

        if (normalized.status === 429) {
          rateLimitError = normalized;
          continue;
        }

        if (
          normalized.message.toLowerCase().includes("invalid_argument") ||
          normalized.status >= 500
        ) {
          continue;
        }

        if (normalized.status !== 429) {
          throw normalized;
        }
      }
    }
  }

  if (bestCandidate && !isLikelyIncompleteReply(bestCandidate)) {
    return bestCandidate;
  }

  if (bestCandidate) {
    return ensureSentence(bestCandidate);
  }

  if (lastError) {
    if (rateLimitError) {
      throw rateLimitError;
    }

    throw lastError;
  }

  throw new ReplyGenerationError("Gemini returned an empty reply.", 500, "empty_response");
}
