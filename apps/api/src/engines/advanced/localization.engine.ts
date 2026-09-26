import { Injectable } from "@nestjs/common";
import { EngineResult, ExecutionContext, TestEngine } from "@atp/engine-contracts";
import { openBrowser } from "../playwright/browser-session";
import { executeWebStep } from "../playwright/playwright.steps";

@Injectable()
export class LocalizationEngine implements TestEngine {
  readonly type = "localization";
  private readonly sessions = new Map<string, { close: () => Promise<void> }>();

  getCapabilities() {
    return { actions: ["navigate", "assertLocale"], browsers: ["chromium"] };
  }

  async validate() {
    return { valid: true, issues: [] };
  }

  async cancel(executionId: string) {
    await this.sessions.get(executionId)?.close();
  }

  async execute(context: ExecutionContext): Promise<EngineResult> {
    const started = Date.now();
    const check = context.steps.find((step) => step.assertion && ("lang" in step.assertion || "includes" in step.assertion));
    const lang = typeof check?.assertion?.lang === "string" ? check.assertion.lang : "";
    const includes = Array.isArray(check?.assertion?.includes) ? check.assertion.includes.filter((item): item is string => typeof item === "string") : [];
    if (!context.steps.some((step) => step.action === "navigate") || (!lang && includes.length === 0)) {
      return this.failed(started, "VALIDATION_ERROR", "A localization test needs a navigate step and a lang or includes assertion");
    }
    const session = await openBrowser(context);
    this.sessions.set(context.jobId, session);
    try {
      for (const step of context.steps) {
        if (step.action === "navigate" || step.action === "click" || step.action === "wait") {
          await executeWebStep(session.page, step, context);
        }
      }
      const pageLang = await session.page.locator("html").getAttribute("lang");
      const text = await session.page.locator("body").innerText();
      if (lang && pageLang !== lang) {
        return this.failed(started, "EXECUTION_ERROR", `Expected lang ${lang} and found ${pageLang ?? "none"}`);
      }
      const missing = includes.filter((item) => !text.includes(item));
      if (missing.length > 0) {
        return this.failed(started, "EXECUTION_ERROR", `Missing text: ${missing.join(", ")}`);
      }
      return { status: "passed", durationMs: Date.now() - started, steps: [], errors: [], artifacts: [], logs: [`locale ${pageLang ?? "unset"}`] };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Localization check failed";
      return this.failed(started, "EXECUTION_ERROR", message);
    } finally {
      this.sessions.delete(context.jobId);
      await session.close();
    }
  }

  private failed(started: number, code: string, message: string): EngineResult {
    return { status: "failed", durationMs: Date.now() - started, steps: [], errors: [{ code, message }], artifacts: [], logs: [message] };
  }
}
