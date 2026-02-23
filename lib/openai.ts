import OpenAI from "openai";

let openAIClient: OpenAI | null = null;
let clientSignature = "";

export type AIProvider = "openai" | "gemini";

function resolveProvider(): AIProvider {
  const configured = process.env.AI_PROVIDER?.trim().toLowerCase();

  if (configured === "gemini") {
    return "gemini";
  }

  if (configured === "openai") {
    return "openai";
  }

  return process.env.GEMINI_API_KEY ? "gemini" : "openai";
}

export function getAIProvider(): AIProvider {
  return resolveProvider();
}

export function getOpenAIClient() {
  const provider = resolveProvider();
  const apiKey =
    provider === "gemini" ? process.env.GEMINI_API_KEY : process.env.OPENAI_API_KEY;
  const baseURL =
    provider === "gemini"
      ? process.env.GEMINI_BASE_URL?.trim() ||
        "https://generativelanguage.googleapis.com/v1beta/openai"
      : "";

  if (!apiKey) {
    if (provider === "gemini") {
      throw new Error("GEMINI_API_KEY is missing.");
    }

    throw new Error("OPENAI_API_KEY is missing.");
  }

  const signature = `${provider}:${baseURL}:${apiKey.slice(0, 10)}`;

  if (!openAIClient || signature !== clientSignature) {
    openAIClient = new OpenAI({
      apiKey,
      ...(baseURL ? { baseURL } : {}),
    });
    clientSignature = signature;
  }

  return openAIClient;
}
