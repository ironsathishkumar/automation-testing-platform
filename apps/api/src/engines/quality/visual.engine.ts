import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ArtifactReference, EngineResult, ExecutionContext, StepResult, TestEngine } from "@atp/engine-contracts";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { resolveInside } from "../../common/safe-path";
import { openBrowser } from "../playwright/browser-session";
import { artifactReference, captureScreenshot, executeWebStep } from "../playwright/playwright.steps";
import { VISUAL_FAIL_RATIO, diffRatio } from "./visual.helpers";

@Injectable()
export class VisualEngine implements TestEngine {
  readonly type = "visual";
  private readonly sessions = new Map<string, { close: () => Promise<void> }>();

  constructor(private readonly config: ConfigService) {}

  getCapabilities() {
    return { actions: ["navigate", "click", "fill", "wait", "screenshot"], browsers: ["chromium"] };
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
      return this.finish("failed", started, steps, [{ code: "VALIDATION_ERROR", message: "A visual test needs a navigate step" }], artifacts, logs);
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
      const shot = await captureScreenshot(session.page, context, "visual.png");
      if (shot) artifacts.push(shot);
      const currentPath = resolveInside(context.artifactDirectory, "screenshots", "visual.png");
      const comparison = this.compare(context, currentPath);
      artifacts.push(...comparison.artifacts);
      logs.push(...comparison.logs);
      if (comparison.error) errors.push(comparison.error);
      return this.finish(comparison.error ? "failed" : "passed", started, steps, errors, artifacts, logs);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Visual comparison failed";
      errors.push({ code: "ENGINE_ERROR", message });
      return this.finish("failed", started, steps, errors, artifacts, logs);
    } finally {
      this.sessions.delete(context.jobId);
      await session.close();
    }
  }

  private compare(context: ExecutionContext, currentPath: string): {
    artifacts: ArtifactReference[];
    logs: string[];
    error?: { code: string; message: string };
  } {
    const artifactRoot = this.config.getOrThrow<string>("ARTIFACT_ROOT");
    const baselineRoot = path.resolve(artifactRoot, "..", "baselines");
    const size = context.viewport ? `${context.viewport.width}x${context.viewport.height}` : "1280x720";
    const baselinePath = resolveInside(baselineRoot, context.projectId, `${context.testId}-${size}.png`);
    if (!existsSync(baselinePath)) {
      mkdirSync(path.dirname(baselinePath), { recursive: true });
      copyFileSync(currentPath, baselinePath);
      return { artifacts: [], logs: [`Saved visual baseline ${path.basename(baselinePath)}`] };
    }
    const baseline = PNG.sync.read(readFileSync(baselinePath));
    const current = PNG.sync.read(readFileSync(currentPath));
    if (baseline.width !== current.width || baseline.height !== current.height) {
      return {
        artifacts: [],
        logs: [],
        error: { code: "EXECUTION_ERROR", message: `Screenshot size ${current.width}x${current.height} does not match baseline ${baseline.width}x${baseline.height}` },
      };
    }
    const diff = new PNG({ width: baseline.width, height: baseline.height });
    const diffPixels = pixelmatch(baseline.data, current.data, diff.data, baseline.width, baseline.height, { threshold: 0.1 });
    const diffFile = path.join(context.artifactDirectory, "screenshots", "visual-diff.png");
    writeFileSync(diffFile, PNG.sync.write(diff));
    const ratio = diffRatio(diffPixels, baseline.width, baseline.height);
    const artifact = artifactReference(context, diffFile, "screenshot", "image/png");
    if (ratio > VISUAL_FAIL_RATIO) {
      return {
        artifacts: [artifact],
        logs: [`visual_diff ${(ratio * 100).toFixed(3)}%`],
        error: { code: "EXECUTION_ERROR", message: `Visual difference ${(ratio * 100).toFixed(3)}% exceeds ${(VISUAL_FAIL_RATIO * 100).toFixed(1)}%` },
      };
    }
    return { artifacts: [artifact], logs: [`visual_match ${(ratio * 100).toFixed(3)}%`] };
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
