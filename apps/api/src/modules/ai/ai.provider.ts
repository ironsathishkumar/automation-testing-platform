import { HttpStatus, Injectable } from "@nestjs/common";
import { AppException } from "../../common/app.exception";
import { aiSettings } from "./ai.parse";

@Injectable()
export class AiProvider {
  async complete(system: string, user: string) {
    let settings: ReturnType<typeof aiSettings>;
    try {
      settings = aiSettings(process.env);
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI provider is misconfigured";
      throw new AppException("CONFIGURATION_ERROR", message, HttpStatus.SERVICE_UNAVAILABLE);
    }
    if (!settings) {
      throw new AppException("CONFIGURATION_ERROR", "Set AI_API_KEY before using AI features", HttpStatus.SERVICE_UNAVAILABLE);
    }
    const response = await fetch(settings.endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${settings.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: settings.model,
        temperature: 0.2,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      throw new AppException("ENGINE_ERROR", `AI provider returned ${response.status}`, HttpStatus.BAD_GATEWAY);
    }
    const body = (await response.json()) as { choices?: { message?: { content?: unknown } }[] };
    const text = body.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) {
      throw new AppException("ENGINE_ERROR", "AI provider returned an empty response", HttpStatus.BAD_GATEWAY);
    }
    return text;
  }
}
