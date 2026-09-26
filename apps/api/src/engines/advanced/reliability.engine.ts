import { Injectable } from "@nestjs/common";
import { EngineResult, ExecutionContext, TestEngine } from "@atp/engine-contracts";
import { safeHttpUrl } from "./advanced.helpers";

@Injectable()
export class ReliabilityEngine implements TestEngine {
  readonly type = "reliability";

  getCapabilities() {
    return { actions: ["repeatRequest"] };
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
    const spec = step?.value && typeof step.value === "object" ? (step.value as Record<string, unknown>) : {};
    const attempts = Math.min(10, Math.max(1, Math.floor(Number(spec.attempts) || 3)));
    const minRatio = Math.min(1, Math.max(0, Number(spec.minSuccessRatio) || 1));
    const target = step?.target || context.apiBaseUrl || context.baseUrl;
    if (!target) return this.failed(started, "VALIDATION_ERROR", "A reliability test needs a URL");
    try {
      const url = safeHttpUrl(target, context.apiBaseUrl ?? context.baseUrl);
      let successes = 0;
      for (let index = 0; index < attempts; index += 1) {
        if (context.signal.aborted) {
          return { status: "cancelled", durationMs: Date.now() - started, steps: [], errors: [], artifacts: [], logs: ["cancelled"] };
        }
        const response = await fetch(url, { signal: context.signal });
        if (response.ok) successes += 1;
      }
      const ratio = successes / attempts;
      if (ratio < minRatio) {
        return this.failed(started, "EXECUTION_ERROR", `${successes}/${attempts} requests succeeded`);
      }
      return {
        status: "passed",
        durationMs: Date.now() - started,
        steps: step ? [{ id: step.id, order: step.order, action: step.action, status: "passed", durationMs: Date.now() - started }] : [],
        errors: [],
        artifacts: [],
        logs: [`reliability ${successes}/${attempts}`],
        metrics: { successes, attempts },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Reliability check failed";
      return this.failed(started, "EXECUTION_ERROR", message);
    }
  }

  private failed(started: number, code: string, message: string): EngineResult {
    return { status: "failed", durationMs: Date.now() - started, steps: [], errors: [{ code, message }], artifacts: [], logs: [message] };
  }
}
