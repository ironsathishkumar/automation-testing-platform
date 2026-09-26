import { writeFileSync } from "node:fs";
import path from "node:path";
import { Injectable } from "@nestjs/common";
import { ArtifactReference, EngineResult, ExecutionContext, TestEngine } from "@atp/engine-contracts";
import { artifactReference } from "../playwright/playwright.steps";
import { k6Profile } from "./advanced.helpers";
import { runCommand } from "./process-runner";

@Injectable()
export class PerformanceEngine implements TestEngine {
  readonly type = "performance";

  getCapabilities() {
    return { actions: ["k6"] };
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
    if (!step) {
      return this.failed(started, [], "VALIDATION_ERROR", "A performance test needs a k6 step");
    }
    const artifacts: ArtifactReference[] = [];
    try {
      const profile = k6Profile(step.value, context.apiBaseUrl ?? context.baseUrl ?? "");
      const scriptPath = path.join(context.artifactDirectory, "k6-script.js");
      writeFileSync(scriptPath, this.script(profile));
      artifacts.push(artifactReference(context, scriptPath, "other", "text/javascript"));
      const result = await runCommand("k6", ["run", scriptPath], Math.min(context.timeoutMs, 60_000), context.signal);
      const logPath = path.join(context.artifactDirectory, "k6.log");
      writeFileSync(logPath, `${result.stdout}\n${result.stderr}`);
      artifacts.push(artifactReference(context, logPath, "log", "text/plain"));
      if (result.code !== 0) {
        return this.failed(started, artifacts, "EXECUTION_ERROR", result.stderr.trim() || `k6 exited ${result.code}`);
      }
      return {
        status: "passed",
        durationMs: Date.now() - started,
        steps: [{ id: step.id, order: step.order, action: step.action, status: "passed", durationMs: Date.now() - started }],
        errors: [],
        artifacts,
        logs: ["k6_passed"],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "k6 failed";
      const code = message.includes("not installed") ? "CONFIGURATION_ERROR" : "EXECUTION_ERROR";
      return this.failed(started, artifacts, code, message);
    }
  }

  private script(profile: { vus: number; seconds: number; url: string }) {
    return `import http from "k6/http";
import { check } from "k6";
export const options = { vus: ${profile.vus}, duration: "${profile.seconds}s" };
export default function () {
  const response = http.get(${JSON.stringify(profile.url)});
  check(response, { "status is 2xx": (item) => item.status >= 200 && item.status < 300 });
}
`;
  }

  private failed(started: number, artifacts: ArtifactReference[], code: string, message: string): EngineResult {
    return { status: "failed", durationMs: Date.now() - started, steps: [], errors: [{ code, message }], artifacts, logs: [message] };
  }
}
