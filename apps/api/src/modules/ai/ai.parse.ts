export function parseModelJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  return JSON.parse(trimmed);
}

export function aiSettings(env: NodeJS.ProcessEnv) {
  const apiKey = env.AI_API_KEY?.trim();
  if (!apiKey) return null;
  const baseUrl = env.AI_BASE_URL?.trim() || "https://api.openai.com/v1";
  const model = env.AI_MODEL?.trim() || "gpt-4o-mini";
  const endpoint = new URL(`${baseUrl.replace(/\/$/, "")}/chat/completions`);
  if (endpoint.protocol !== "https:" && endpoint.hostname !== "127.0.0.1" && endpoint.hostname !== "localhost") {
    throw new Error("AI_BASE_URL must use https, or localhost");
  }
  return { apiKey, model, endpoint: endpoint.toString() };
}
