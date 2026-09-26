import { Injectable } from "@nestjs/common";
import { EngineResult, ExecutionContext, TestEngine } from "@atp/engine-contracts";
import { appiumCapabilities, safeHttpUrl } from "./advanced.helpers";

@Injectable()
export class MobileEngine implements TestEngine {
  readonly type = "mobile";

  getCapabilities() {
    return { actions: ["appiumSession"] };
  }

  async validate() {
    return { valid: true, issues: [] };
  }

  async cancel() {
    return undefined;
  }

  async execute(context: ExecutionContext): Promise<EngineResult> {
    const started = Date.now();
    const server = process.env.APPIUM_URL;
    if (!server) {
      return this.failed(started, "CONFIGURATION_ERROR", "Set APPIUM_URL to a running Appium server");
    }
    const step = context.steps[0];
    if (!step) return this.failed(started, "VALIDATION_ERROR", "A mobile test needs capabilities");
    try {
      const capabilities = appiumCapabilities(step.value);
      const statusUrl = safeHttpUrl("/status", server);
      const status = await fetch(statusUrl, { signal: context.signal });
      if (!status.ok) return this.failed(started, "CONFIGURATION_ERROR", `Appium status returned ${status.status}`);
      const created = await fetch(safeHttpUrl("/session", server), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ capabilities }),
        signal: context.signal,
      });
      const payload = (await created.json().catch(() => null)) as { value?: { sessionId?: string; error?: string; message?: string } } | null;
      const sessionId = payload?.value?.sessionId;
      if (!created.ok || !sessionId) {
        return this.failed(started, "EXECUTION_ERROR", payload?.value?.message ?? `Appium did not start a session (${created.status})`);
      }
      await fetch(safeHttpUrl(`/session/${encodeURIComponent(sessionId)}`, server), { method: "DELETE", signal: context.signal });
      return {
        status: "passed",
        durationMs: Date.now() - started,
        steps: [{ id: step.id, order: step.order, action: step.action, status: "passed", durationMs: Date.now() - started }],
        errors: [],
        artifacts: [],
        logs: ["appium_session_closed"],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Appium session failed";
      return this.failed(started, message.includes("not allowed") || message.includes("must be") ? "VALIDATION_ERROR" : "EXECUTION_ERROR", message);
    }
  }

  private failed(started: number, code: string, message: string): EngineResult {
    return { status: "failed", durationMs: Date.now() - started, steps: [], errors: [{ code, message }], artifacts: [], logs: [message] };
  }
}
