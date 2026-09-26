import { HttpStatus, Injectable } from "@nestjs/common";
import { AppException } from "../../common/app.exception";
import { AiSettingsService } from "./ai-settings.service";

const REQUEST_TIMEOUT_MS = 120_000;

@Injectable()
export class AiProvider {
  constructor(private readonly settings: AiSettingsService) {}

  async complete(system: string, user: string) {
    const connection = await this.settings.connection();
    let response: Response;
    try {
      response = await fetch(connection.endpoint, {
        method: "POST",
        headers: {
          authorization: `Bearer ${connection.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: connection.model,
          temperature: 0.2,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "TimeoutError";
      throw new AppException(
        "ENGINE_ERROR",
        timedOut ? "The AI provider did not answer within 2 minutes" : `Could not reach the AI provider at ${new URL(connection.endpoint).origin}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
    if (!response.ok) {
      throw new AppException("ENGINE_ERROR", await providerError(response), HttpStatus.BAD_GATEWAY);
    }
    const body = (await response.json()) as { choices?: { message?: { content?: unknown } }[] };
    const text = body.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) {
      throw new AppException("ENGINE_ERROR", "AI provider returned an empty response", HttpStatus.BAD_GATEWAY);
    }
    return text;
  }
}

async function providerError(response: Response) {
  type ErrorBody = { error?: { message?: unknown } | string };
  const detail = await response
    .json()
    .then((raw: ErrorBody | ErrorBody[]) => {
      const body = Array.isArray(raw) ? raw[0] : raw;
      return typeof body?.error === "string" ? body.error : body?.error?.message;
    })
    .catch(() => undefined);
  const reason =
    response.status === 401 || response.status === 403
      ? "rejected the API key"
      : response.status === 404
        ? "does not know that model or URL"
        : response.status === 429
          ? "is rate limiting or out of quota"
          : `returned ${response.status}`;
  return `AI provider ${reason}${typeof detail === "string" && detail ? `: ${detail.slice(0, 200)}` : ""}`;
}
