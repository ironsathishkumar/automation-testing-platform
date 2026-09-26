import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { AiSettingsInput } from "@atp/validation";
import { Model, Types } from "mongoose";
import { AppException } from "../../common/app.exception";
import { AiSettings } from "./ai-settings.schema";
import { AiConnection, aiSettings, buildAiConnection, LOCAL_AI_KEY } from "./ai.parse";

const SCOPE = "default";
export const NOT_CONFIGURED = "AI is not set up yet. Open the AI page and add a provider (OpenAI, Gemini, Groq, or a local Ollama).";

export interface AiSettingsView {
  configured: boolean;
  source: "settings" | "env" | null;
  baseUrl: string | null;
  model: string | null;
  keyHint: string | null;
  message: string | null;
}

@Injectable()
export class AiSettingsService {
  constructor(@InjectModel(AiSettings.name) private readonly settings: Model<AiSettings>) {}

  async connection(): Promise<AiConnection> {
    const stored = await this.settings.findOne({ scope: SCOPE });
    try {
      const connection = stored ? buildAiConnection(stored) : aiSettings(process.env);
      if (connection) return connection;
    } catch (error) {
      throw new AppException("CONFIGURATION_ERROR", error instanceof Error ? error.message : "AI provider is misconfigured", HttpStatus.SERVICE_UNAVAILABLE);
    }
    throw new AppException("CONFIGURATION_ERROR", NOT_CONFIGURED, HttpStatus.SERVICE_UNAVAILABLE);
  }

  async view(): Promise<AiSettingsView> {
    const stored = await this.settings.findOne({ scope: SCOPE });
    if (stored) {
      return { configured: true, source: "settings", baseUrl: stored.baseUrl, model: stored.model, keyHint: hint(stored.apiKey), message: null };
    }
    try {
      const fromEnv = aiSettings(process.env);
      if (fromEnv) {
        return { configured: true, source: "env", baseUrl: process.env.AI_BASE_URL?.trim() || "https://api.openai.com/v1", model: fromEnv.model, keyHint: hint(fromEnv.apiKey), message: null };
      }
      return { configured: false, source: null, baseUrl: null, model: null, keyHint: null, message: NOT_CONFIGURED };
    } catch (error) {
      return { configured: false, source: "env", baseUrl: null, model: null, keyHint: null, message: error instanceof Error ? error.message : "AI provider is misconfigured" };
    }
  }

  async save(input: AiSettingsInput, userId: string) {
    const stored = await this.settings.findOne({ scope: SCOPE });
    const sameProvider = stored?.baseUrl === input.baseUrl;
    const apiKey = input.apiKey || (sameProvider ? stored?.apiKey ?? "" : "");
    try {
      if (!buildAiConnection({ apiKey, baseUrl: input.baseUrl, model: input.model })) {
        throw new Error("Enter the API key for this provider");
      }
    } catch (error) {
      throw new AppException("VALIDATION_ERROR", error instanceof Error ? error.message : "Invalid AI settings", HttpStatus.BAD_REQUEST);
    }
    await this.settings.findOneAndUpdate(
      { scope: SCOPE },
      { baseUrl: input.baseUrl, model: input.model, apiKey, updatedBy: new Types.ObjectId(userId) },
      { upsert: true, new: true },
    );
    return this.view();
  }

  async clear() {
    await this.settings.deleteOne({ scope: SCOPE });
    return this.view();
  }
}

function hint(apiKey: string) {
  if (!apiKey || apiKey === LOCAL_AI_KEY) return null;
  return apiKey.length > 8 ? `…${apiKey.slice(-4)}` : "saved";
}
