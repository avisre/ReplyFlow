export const REPLY_SYSTEM_PROMPT = `You are a professional, warm, and friendly business owner responding to a Google review. Write genuine, human-sounding replies in under 100 words. Match the tone to the star rating: enthusiastic and grateful for 4-5 stars, empathetic and solution-focused for 1-3 stars. Never sound corporate or robotic. Never mention you are AI. Use the reviewer's first name if available. Never include phone numbers, email addresses, website URLs, social handles, physical addresses, or directions. Do not ask users to call/email/visit a specific contact channel. If help is needed, use this exact line: "If you need any help or have any questions, please reach out." Return only the final customer-facing reply text with no analysis, no planning notes, and no self-references.`;

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

type ReplyStyle = "default" | "quick_pro" | "warm_personal" | "growth_recovery";

const DEFAULT_MODEL_LIST = "gemini-2.5-flash,gemini-2.0-flash,gemini-2.0-flash-lite";
const DEFAULT_TIMEOUT_MS = 12000;
const DEFAULT_MAX_ATTEMPTS = 1;
const INTERNAL_REASONING_PATTERNS = [
  /\bthe user wants me to\b/i,
  /\blet me break (it|this) down\b/i,
  /\bi need to\b/i,
  /\bfirst,\s*i see\b/i,
  /\bword count requirement\b/i,
  /\brequirements?\b/i,
  /\bmy response should\b/i,
  /\bhere'?s my (analysis|reasoning)\b/i,
];

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

function getFirstName(name: string) {
  const token = name.trim().split(/\s+/)[0] ?? "there";
  const normalized = token.replace(/[^A-Za-z'-]/g, "");
  return normalized || "there";
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

function isInternalReasoningReply(text: string) {
  const normalized = text.trim();
  if (!normalized) {
    return false;
  }

  if (/^(okay|alright|sure|let me)\b/i.test(normalized) && /the user|i need to|break this down/i.test(normalized)) {
    return true;
  }

  return INTERNAL_REASONING_PATTERNS.some((pattern) => pattern.test(normalized));
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
  const normalized = ensureSentence(text);
  const words = normalized.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return normalized;
  }

  const sentences = normalized.match(/[^.!?]+[.!?]+/g)?.map((sentence) => sentence.trim()) ?? [];
  if (sentences.length > 1) {
    const kept: string[] = [];
    for (const sentence of sentences) {
      const candidate = [...kept, sentence].join(" ");
      if (countWords(candidate) > maxWords) {
        break;
      }

      kept.push(sentence);
    }

    if (kept.length > 0) {
      return ensureSentence(kept.join(" "));
    }
  }

  return ensureSentence(words.slice(0, maxWords).join(" "));
}

function getStyleRequirements(style: ReplyStyle, rating: number) {
  if (style === "quick_pro") {
    return [
      "- Style: Quick Pro",
      "- 25 to 50 words",
      "- Concise and polished",
      "- Maximum 2 sentences",
      "- Prioritize clarity and professionalism",
    ];
  }

  if (style === "warm_personal") {
    return [
      "- Style: Warm Personal",
      "- 45 to 80 words",
      "- Warm and personable tone",
      "- Mention appreciation and one specific detail from the review",
      "- Keep it natural and human",
    ];
  }

  if (style === "growth_recovery") {
    return rating >= 4
      ? [
        "- Style: Growth",
        "- 55 to 95 words",
        "- Thank them and reinforce trust",
        "- Include a subtle invitation to return",
        "- Keep wording premium and professional",
      ]
      : [
        "- Style: Recovery",
        "- 55 to 95 words",
        "- Lead with empathy and accountability",
        "- Mention concrete improvement focus",
        '- End with: "If you need any help or have any questions, please reach out."',
      ];
  }

  return [
    "- Style: Professional default",
    "- 35 to 90 words",
    "- Natural, specific, and complete",
    "- Professional and friendly",
  ];
}

function buildSingleReplyPrompt({
  reviewerName,
  rating,
  reviewText,
  style = "default",
  variationTag,
  avoidText,
}: {
  reviewerName: string;
  rating: number;
  reviewText: string;
  style?: ReplyStyle;
  variationTag?: string;
  avoidText?: string;
}) {
  const firstName = getFirstName(reviewerName);
  const avoidExcerpt = avoidText?.trim().slice(0, 260);

  return [
    `Reviewer first name: ${firstName}`,
    `Star rating: ${rating}`,
    `Review text: ${reviewText}`,
    avoidExcerpt ? `Existing draft wording to avoid repeating: ${avoidExcerpt}` : "",
    "Reply requirements:",
    ...getStyleRequirements(style, rating),
    "- Do not include placeholders",
    "- Never include phone, email, URL, social, or address details",
    "- Never ask them to contact a specific channel",
    '- If help is needed, use exactly: "If you need any help or have any questions, please reach out."',
    "- Return only the final customer-facing reply text",
    "- If an existing draft is provided, use clearly different wording and sentence structure",
    "- Never include analysis, reasoning, planning, or process notes",
    '- Never write phrases like "the user", "I need to", or "let me break this down"',
    "- One paragraph only",
    "- End with a complete sentence and punctuation",
    variationTag ? `- Variation marker for wording diversity (do not output): ${variationTag}` : "",
  ].filter(Boolean).join("\n");
}

function buildTemplateReply({
  reviewerName,
  rating,
  style = "default",
}: {
  reviewerName: string;
  rating: number;
  style?: ReplyStyle;
}) {
  const firstName = getFirstName(reviewerName);

  if (style === "quick_pro") {
    if (rating >= 4) {
      return trimWords(
        `Hi ${firstName}, thank you for your great review. We are glad you had a smooth experience and truly appreciate your support.`,
        50,
      );
    }

    return trimWords(
      `Hi ${firstName}, thank you for your feedback. We are sorry your experience was not fully smooth, and we are actively improving this area.`,
      50,
    );
  }

  if (style === "warm_personal" || style === "default") {
    if (rating >= 4) {
      return trimWords(
        `Hi ${firstName}, thank you for the wonderful review. We are delighted to hear you had a great experience and that our team made the process easy and friendly. We truly appreciate your support and look forward to welcoming you again soon.`,
        90,
      );
    }

    if (rating === 3) {
      return trimWords(
        `Hi ${firstName}, thank you for your feedback. We are glad parts of your visit went well, and we are sorry the wait time felt longer than expected. We are working on improving pacing and communication so your next experience is smoother. We appreciate you sharing this with us.`,
        90,
      );
    }

    return trimWords(
      `Hi ${firstName}, thank you for your honest feedback, and we are sorry your experience did not meet expectations. We take your comments seriously and are addressing this with our team to improve service quality and communication. If you need any help or have any questions, please reach out.`,
      90,
    );
  }

  if (rating >= 4) {
    return trimWords(
      `Hi ${firstName}, thank you for your kind review. We are pleased to know our team delivered a strong experience. We remain committed to excellent service and would be glad to welcome you back soon.`,
      90,
    );
  }

  if (rating === 3) {
    return trimWords(
      `Hi ${firstName}, thank you for your feedback. We are sorry parts of your visit did not meet your expectations. We are actively improving wait-time management and communication so your next visit feels more consistent and smooth.`,
      90,
    );
  }

  return trimWords(
    `Hi ${firstName}, thank you for your honest feedback, and we are sorry your experience did not meet expectations. We take your comments seriously and are addressing this with our team to improve service quality and communication. If you need any help or have any questions, please reach out.`,
    90,
  );
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

function tokenizeForSimilarity(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 4);
}

function lexicalSimilarity(a: string, b: string) {
  const setA = new Set(tokenizeForSimilarity(a));
  const setB = new Set(tokenizeForSimilarity(b));
  if (setA.size === 0 || setB.size === 0) {
    return 0;
  }

  let overlap = 0;
  for (const token of Array.from(setA)) {
    if (setB.has(token)) {
      overlap += 1;
    }
  }

  return overlap / Math.min(setA.size, setB.size);
}

function isTooSimilar(a: string, b: string) {
  return lexicalSimilarity(a, b) >= 0.7;
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

function createVariationTag(scope: string) {
  return `${scope}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function generateReplyOptions({
  reviewerName,
  rating,
  reviewText,
  avoidReplyText,
}: {
  reviewerName: string;
  rating: number;
  reviewText: string;
  avoidReplyText?: string;
}) {
  const runTag = createVariationTag("regen");
  const plans: Array<{
    key: ReplyOption["key"];
    label: ReplyOption["label"];
    style: ReplyStyle;
    maxWords: number;
    maxOutputTokens: number;
    temperature: number;
  }> = [
    {
      key: "quick_pro",
      label: "Quick Pro",
      style: "quick_pro",
      maxWords: 50,
      maxOutputTokens: 110,
      temperature: 0.7,
    },
    {
      key: "warm_personal",
      label: "Warm Personal",
      style: "warm_personal",
      maxWords: 80,
      maxOutputTokens: 160,
      temperature: 0.78,
    },
    {
      key: "growth_recovery",
      label: "Growth/Recovery",
      style: "growth_recovery",
      maxWords: 95,
      maxOutputTokens: 200,
      temperature: 0.82,
    },
  ];

  const generated: ReplyOption[] = [];
  for (const plan of plans) {
    const text = await generateReplyText({
      reviewerName,
      rating,
      reviewText,
      avoidText: avoidReplyText,
      style: plan.style,
      maxOutputTokens: plan.maxOutputTokens,
      temperature: plan.temperature,
      variationTag: createVariationTag(`${runTag}-${plan.key}`),
    });

    const normalized = trimWords(ensureSentence(text), plan.maxWords);
    generated.push({
      key: plan.key,
      label: plan.label,
      text: normalized,
      wordCount: countWords(normalized),
    });
  }

  for (let index = 1; index < generated.length; index += 1) {
    const current = generated[index];
    if (!current) {
      continue;
    }

    const previous = generated.slice(0, index).map((item) => item.text);
    const needsRewrite = previous.some((item) => isTooSimilar(item, current.text));
    if (!needsRewrite) {
      continue;
    }

    const plan = plans[index];
    if (!plan) {
      continue;
    }

    const strongerAvoid = [avoidReplyText, ...previous].filter(Boolean).join(" ");
    const rewritten = await generateReplyText({
      reviewerName,
      rating,
      reviewText,
      avoidText: strongerAvoid,
      style: plan.style,
      maxOutputTokens: plan.maxOutputTokens,
      temperature: Math.min(plan.temperature + 0.06, 0.92),
      variationTag: createVariationTag(`${runTag}-${plan.key}-rewrite`),
    });

    const normalizedRewrite = trimWords(ensureSentence(rewritten), plan.maxWords);
    generated[index] = {
      ...current,
      text: normalizedRewrite,
      wordCount: countWords(normalizedRewrite),
    };
  }

  const unique = dedupeOptions(generated.map((item) => item.text));
  if (unique.length < 3) {
    const fallbackSeed = generated[1]?.text || generated[0]?.text || buildTemplateReply({
      reviewerName,
      rating,
      style: "warm_personal",
    });
    const fallbackSet = normalizeToThreeOptions([fallbackSeed], rating);
    const composed = dedupeOptions([...generated.map((item) => item.text), ...fallbackSet]).slice(0, 3);
    return toReplyOptions(composed);
  }

  return generated;
}

export async function generateReplyText({
  reviewerName,
  rating,
  reviewText,
  avoidText,
  style = "default",
  variationTag,
  maxOutputTokens,
  temperature,
}: {
  reviewerName: string;
  rating: number;
  reviewText: string;
  avoidText?: string;
  style?: ReplyStyle;
  variationTag?: string;
  maxOutputTokens?: number;
  temperature?: number;
}) {
  const models = getModelList();
  const maxAttempts = getMaxAttempts();
  const baseOutputTokens = maxOutputTokens && maxOutputTokens > 30 ? maxOutputTokens : 140;
  const baseTemperature = Number.isFinite(temperature) ? Number(temperature) : 0.62;
  let bestCandidate = "";
  let lastError: ReplyGenerationError | null = null;
  let rateLimitError: ReplyGenerationError | null = null;
  const templateFallback = buildTemplateReply({ reviewerName, rating, style });

  for (const model of models) {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const attemptTokens = attempt === 1 ? baseOutputTokens : Math.min(baseOutputTokens + 60, 260);
        const attemptTemperature = attempt === 1
          ? baseTemperature
          : Math.min(baseTemperature + 0.04, 0.95);
        const result = await generateWithGemini({
          model,
          userPrompt: buildSingleReplyPrompt({
            reviewerName,
            rating,
            reviewText,
            avoidText,
            style,
            variationTag: variationTag ? `${variationTag}-a${attempt}` : undefined,
          }),
          maxOutputTokens: attemptTokens,
          temperature: attemptTemperature,
        });

        const cleaned = ensureSentence(result.text);
        if (isInternalReasoningReply(cleaned)) {
          lastError = new ReplyGenerationError(
            "AI returned internal reasoning instead of a customer-facing reply.",
            502,
            "invalid_reasoning",
          );
          continue;
        }

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

  if (bestCandidate && !isInternalReasoningReply(bestCandidate)) {
    return ensureSentence(bestCandidate);
  }

  if (lastError?.code === "invalid_reasoning") {
    return templateFallback;
  }

  if (lastError) {
    if (rateLimitError) {
      throw rateLimitError;
    }

    throw lastError;
  }

  return templateFallback;
}
