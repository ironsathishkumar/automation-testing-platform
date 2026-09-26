import { writeFileSync } from "node:fs";
import path from "node:path";
import { Injectable } from "@nestjs/common";
import { EngineResult, ExecutionContext, TestEngine } from "@atp/engine-contracts";
import { artifactReference } from "../playwright/playwright.steps";
import { missingSecurityHeaders, safeHttpUrl } from "./advanced.helpers";

@Injectable()
export class SecurityEngine implements TestEngine {
  readonly type = "security";

  getCapabilities() {
    return { actions: ["securityHeaders"] };
  }

  async validate() {
    return { valid: true, issues: [] };
  }

  async cancel() {
    return undefined;
  }

  async execute(context: ExecutionContext): Promise<EngineResult> {
    const started = Date.now();
    const target = context.steps[0]?.target || context.baseUrl;
    if (!target) {
      return this.failed(started, "VALIDATION_ERROR", "A security test needs a page URL");
    }
    try {
      const url = safeHttpUrl(target, context.baseUrl);
      const response = await fetch(url, { signal: context.signal, redirect: "follow" });
      const missing = missingSecurityHeaders(url, response.headers);
      const report = path.join(context.artifactDirectory, "security-headers.json");
      writeFileSync(report, JSON.stringify({ url: url.toString(), status: response.status, missing }, null, 2));
      const artifact = artifactReference(context, report, "report", "application/json");
      if (missing.length > 0) {
        return {
          status: "failed",
          durationMs: Date.now() - started,
          steps: [],
          errors: [{ code: "EXECUTION_ERROR", message: `Missing security headers: ${missing.join(", ")}` }],
          artifacts: [artifact],
          logs: missing,
        };
      }
      return { status: "passed", durationMs: Date.now() - started, steps: [], errors: [], artifacts: [artifact], logs: ["security_headers_present"] };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Header check failed";
      return this.failed(started, "EXECUTION_ERROR", message);
    }
  }

  private failed(started: number, code: string, message: string): EngineResult {
    return { status: "failed", durationMs: Date.now() - started, steps: [], errors: [{ code, message }], artifacts: [], logs: [message] };
  }
}
