import { writeFileSync } from "node:fs";
import path from "node:path";
import { Injectable } from "@nestjs/common";
import AxeBuilder from "@axe-core/playwright";
import { ArtifactReference, EngineResult, ExecutionContext, StepResult, TestEngine } from "@atp/engine-contracts";
import { openBrowser } from "../playwright/browser-session";
import { artifactReference, executeWebStep } from "../playwright/playwright.steps";

@Injectable()
export class AccessibilityEngine implements TestEngine {
  readonly type = "accessibility";
  private readonly sessions = new Map<string, { close: () => Promise<void> }>();

  getCapabilities() {
    return { actions: ["navigate", "click", "fill", "wait", "assertVisible"], browsers: ["chromium", "firefox", "webkit"] };
  }

  async validate() {
    return { valid: true, issues: [] };
  }

  async cancel(executionId: string) {
    const session = this.sessions.get(executionId);
    if (session) await session.close();
  }

  async execute(context: ExecutionContext): Promise<EngineResult> {
    const started = Date.now();
    const steps: StepResult[] = [];
    const artifacts: ArtifactReference[] = [];
    const logs: string[] = [];
    const errors: EngineResult["errors"] = [];
    if (!context.steps.some((step) => step.action === "navigate")) {
      return this.finish("failed", started, steps, [{ code: "VALIDATION_ERROR", message: "An accessibility test needs a navigate step" }], artifacts, logs);
    }
    const session = await openBrowser(context);
    this.sessions.set(context.jobId, session);
    try {
      for (const step of context.steps) {
        if (context.signal.aborted) return this.finish("cancelled", started, steps, errors, artifacts, logs);
        const stepStarted = Date.now();
        const produced = await executeWebStep(session.page, step, context);
        artifacts.push(...produced);
        steps.push({ id: step.id, order: step.order, action: step.action, status: "passed", durationMs: Date.now() - stepStarted });
      }
      const scan = await new AxeBuilder({ page: session.page }).analyze();
      const reportFile = path.join(context.artifactDirectory, "accessibility.json");
      writeFileSync(reportFile, JSON.stringify({ violations: scan.violations, passes: scan.passes.length }, null, 2));
      artifacts.push(artifactReference(context, reportFile, "report", "application/json"));
      if (scan.violations.length > 0) {
        const message = scan.violations.map((violation) => `${violation.id} (${violation.impact ?? "unknown"})`).join(", ");
        errors.push({ code: "EXECUTION_ERROR", message: `Accessibility violations: ${message}` });
        logs.push(`accessibility_failed ${scan.violations.length}`);
        return this.finish("failed", started, steps, errors, artifacts, logs);
      }
      logs.push("accessibility_passed");
      return this.finish("passed", started, steps, errors, artifacts, logs);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Accessibility scan failed";
      errors.push({ code: "ENGINE_ERROR", message });
      return this.finish("failed", started, steps, errors, artifacts, logs);
    } finally {
      this.sessions.delete(context.jobId);
      await session.close();
    }
  }

  private finish(
    status: EngineResult["status"],
    started: number,
    steps: StepResult[],
    errors: EngineResult["errors"],
    artifacts: ArtifactReference[],
    logs: string[],
  ): EngineResult {
    return { status, durationMs: Date.now() - started, steps, errors, artifacts, logs };
  }
}
