import { Injectable } from "@nestjs/common";
import { EngineResult, ExecutionContext, TestEngine } from "@atp/engine-contracts";
import { applyVariables } from "../api/api.helpers";
import { safeHttpUrl } from "./advanced.helpers";

@Injectable()
export class NotificationEngine implements TestEngine {
  readonly type = "notification";

  getCapabilities() {
    return { actions: ["webhook"] };
  }

  async validate() {
    return { valid: true, issues: [] };
  }

  async cancel() {
    return undefined;
  }

  async execute(context: ExecutionContext): Promise<EngineResult> {
    const started = Date.now();
    const step = context.steps[0];
    if (!step?.target) return this.failed(started, "VALIDATION_ERROR", "A notification test needs a webhook URL");
    try {
      const url = safeHttpUrl(applyVariables(step.target, context.variables));
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(step.value ?? {}),
        signal: context.signal,
      });
      if (!response.ok) return this.failed(started, "EXECUTION_ERROR", `Webhook returned ${response.status}`);
      return {
        status: "passed",
        durationMs: Date.now() - started,
        steps: [{ id: step.id, order: step.order, action: step.action, status: "passed", durationMs: Date.now() - started }],
        errors: [],
        artifacts: [],
        logs: [`webhook ${response.status}`],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Webhook failed";
      return this.failed(started, "EXECUTION_ERROR", message);
    }
  }

  private failed(started: number, code: string, message: string): EngineResult {
    return { status: "failed", durationMs: Date.now() - started, steps: [], errors: [{ code, message }], artifacts: [], logs: [message] };
  }
}
