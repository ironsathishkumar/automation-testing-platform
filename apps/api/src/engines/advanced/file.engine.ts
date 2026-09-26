import { readFileSync } from "node:fs";
import path from "node:path";
import { Injectable } from "@nestjs/common";
import { EngineResult, ExecutionContext, TestEngine } from "@atp/engine-contracts";
import { resolveInside } from "../../common/safe-path";
import { detectRepoRoot } from "../../config/configuration";

@Injectable()
export class FileEngine implements TestEngine {
  readonly type = "file";

  getCapabilities() {
    return { actions: ["compareFile"] };
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
    const expected = typeof spec.equals === "string" ? spec.equals : typeof spec.contains === "string" ? spec.contains : "";
    if (!step?.target || !expected) {
      return this.failed(started, "VALIDATION_ERROR", "A file test needs a fixture path and expected text");
    }
    try {
      const fixtures = path.join(detectRepoRoot(), "storage", "fixtures");
      const file = resolveInside(fixtures, step.target);
      const text = readFileSync(file, "utf8").slice(0, 1_000_000);
      const matches = typeof spec.equals === "string" ? text === spec.equals : text.includes(expected);
      if (!matches) return this.failed(started, "EXECUTION_ERROR", `${step.target} did not match the expected text`);
      return {
        status: "passed",
        durationMs: Date.now() - started,
        steps: [{ id: step.id, order: step.order, action: step.action, status: "passed", durationMs: Date.now() - started }],
        errors: [],
        artifacts: [],
        logs: [`file_ok ${step.target}`],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "File comparison failed";
      return this.failed(started, "EXECUTION_ERROR", message);
    }
  }

  private failed(started: number, code: string, message: string): EngineResult {
    return { status: "failed", durationMs: Date.now() - started, steps: [], errors: [{ code, message }], artifacts: [], logs: [message] };
  }
}
