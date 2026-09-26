export function parseModelJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  return JSON.parse(trimmed);
}

export interface AiConnection {
  apiKey: string;
  model: string;
  endpoint: string;
}

export const LOCAL_AI_KEY = "local";

export function isLocalUrl(url: string) {
  try {
    const { hostname } = new URL(url);
    return hostname === "127.0.0.1" || hostname === "localhost";
  } catch {
    return false;
  }
}

export function buildAiConnection(input: { apiKey?: string; baseUrl?: string; model?: string }): AiConnection | null {
  const baseUrl = input.baseUrl?.trim() || "https://api.openai.com/v1";
  const apiKey = input.apiKey?.trim() || (isLocalUrl(baseUrl) ? LOCAL_AI_KEY : "");
  if (!apiKey) return null;
  const model = input.model?.trim() || "gpt-4o-mini";
  const endpoint = new URL(`${baseUrl.replace(/\/$/, "")}/chat/completions`);
  if (endpoint.protocol !== "https:" && !isLocalUrl(endpoint.toString())) {
    throw new Error("The AI provider URL must use https, or localhost");
  }
  return { apiKey, model, endpoint: endpoint.toString() };
}

export function aiSettings(env: NodeJS.ProcessEnv) {
  if (!env.AI_API_KEY?.trim()) return null;
  return buildAiConnection({ apiKey: env.AI_API_KEY, baseUrl: env.AI_BASE_URL, model: env.AI_MODEL });
}
