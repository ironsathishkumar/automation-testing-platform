import { readFileSync } from "node:fs";
import { Injectable } from "@nestjs/common";
import { EngineResult, ExecutionContext, TestEngine } from "@atp/engine-contracts";
import { resolveInside } from "../../common/safe-path";
import { detectRepoRoot } from "../../config/configuration";

const ROOTS = ["apps/", "packages/", "docs/"];

@Injectable()
export class ArchitectureEngine implements TestEngine {
  readonly type = "architecture";

  getCapabilities() {
    return { actions: ["fileContains"] };
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
    const relative = step?.target ?? "";
    const expected = typeof step?.value === "string" ? step.value : "";
    if (!ROOTS.some((root) => relative.startsWith(root)) || !expected) {
      return this.failed(started, "VALIDATION_ERROR", "An architecture check needs a path under apps, packages, or docs and expected text");
    }
    try {
      const file = resolveInside(detectRepoRoot(), relative);
      const text = readFileSync(file, "utf8").slice(0, 1_000_000);
      if (!text.includes(expected)) {
        return this.failed(started, "EXECUTION_ERROR", `${relative} does not contain the expected text`);
      }
      return {
        status: "passed",
        durationMs: Date.now() - started,
        steps: [{ id: step.id, order: step.order, action: step.action, status: "passed", durationMs: Date.now() - started }],
        errors: [],
        artifacts: [],
        logs: [`architecture_ok ${relative}`],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Architecture check failed";
      return this.failed(started, "EXECUTION_ERROR", message);
    }
  }

  private failed(started: number, code: string, message: string): EngineResult {
    return { status: "failed", durationMs: Date.now() - started, steps: [], errors: [{ code, message }], artifacts: [], logs: [message] };
  }
}
