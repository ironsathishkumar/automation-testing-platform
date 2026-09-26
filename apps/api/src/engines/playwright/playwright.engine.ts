import { mkdirSync } from "node:fs";
import path from "node:path";
import { Injectable } from "@nestjs/common";
import { ArtifactReference, EngineResult, ExecutionContext, StepResult, TestEngine } from "@atp/engine-contracts";
import { Browser, BrowserContext, Page } from "playwright";
import { launchBrowser } from "./browser-session";
import { artifactReference, captureScreenshot, executeWebStep } from "./playwright.steps";

const WATCH_END_PAUSE_MS = 1500;
// A shared session whose next test never arrives (cancelled run, API restart) must not keep a browser open forever.
const SHARED_IDLE_MS = 5 * 60_000;

interface Session {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  startedAt: number;
  idleTimer?: NodeJS.Timeout;
}

@Injectable()
export class PlaywrightEngine implements TestEngine {
  readonly type = "web";
  private readonly shared = new Map<string, Session>();
  private readonly running = new Map<string, () => Promise<void>>();

  getCapabilities() {
    return {
      actions: ["navigate", "click", "fill", "press", "select", "check", "uncheck", "upload", "download", "assertText", "assertVisible", "wait", "screenshot"],
      browsers: ["chromium", "firefox", "webkit"],
    };
  }

  async validate() {
    return { valid: true, issues: [] };
  }

  async cancel(executionId: string) {
    await this.running.get(executionId)?.();
  }

  async execute(context: ExecutionContext): Promise<EngineResult> {
    const started = Date.now();
    const logs: string[] = [];
    const steps: StepResult[] = [];
    const artifacts: ArtifactReference[] = [];
    const errors: { code: string; message: string }[] = [];
    const sharedKey = context.session?.key;
    let owned: Session | undefined;
    try {
      const session = sharedKey ? await this.sharedSession(context, logs) : await this.openSession(context, context.artifactDirectory, logs);
      if (!sharedKey) owned = session;
      this.running.set(context.jobId, () => (sharedKey ? this.closeShared(sharedKey) : closeSession(session)));
      if (sharedKey) await session.context.tracing.startChunk({ title: context.testId });
      const recordingOffsetMs = Date.now() - session.startedAt;

      let failed = false;
      for (const step of context.steps) {
        if (context.signal.aborted) return this.finish("cancelled", started, steps, errors, artifacts, logs);
        const stepStarted = Date.now();
        try {
          artifacts.push(...(await executeWebStep(session.page, step, context)));
          steps.push({ id: step.id, order: step.order, action: step.action, status: "passed", durationMs: Date.now() - stepStarted });
          const shot = await captureScreenshot(session.page, context, `step-${step.order}.png`).catch(() => undefined);
          if (shot) artifacts.push(shot);
          logs.push(`step_passed ${step.action}`);
        } catch (error) {
          failed = true;
          const message = error instanceof Error ? error.message : "Step failed";
          const shot = await captureScreenshot(session.page, context, `failure-${step.order}.png`).catch(() => undefined);
          if (shot) artifacts.push(shot);
          steps.push({ id: step.id, order: step.order, action: step.action, status: "failed", durationMs: Date.now() - stepStarted, error: message });
          errors.push({ code: message.toLowerCase().includes("timeout") ? "TIMEOUT_ERROR" : "EXECUTION_ERROR", message });
          logs.push(`step_failed ${step.action}: ${message}`);
          break;
        }
      }
      if (context.signal.aborted) return this.finish("cancelled", started, steps, errors, artifacts, logs);

      const tracePath = path.join(context.artifactDirectory, "trace.zip");
      if (sharedKey && context.session) {
        await session.context.tracing.stopChunk({ path: tracePath });
        artifacts.push(artifactReference(context, tracePath, "trace", "application/zip"));
        const last = context.session.index >= context.session.total - 1;
        const runArtifacts = last ? await this.finishShared(sharedKey, context, logs) : [];
        if (!last) this.scheduleIdleClose(sharedKey, session);
        const outcome = this.finish(failed ? "failed" : "passed", started, steps, errors, artifacts, logs);
        return { ...outcome, runArtifacts, metrics: { recordingOffsetMs } };
      }

      if (context.headed) await session.page.waitForTimeout(WATCH_END_PAUSE_MS).catch(() => undefined);
      await session.context.tracing.stop({ path: tracePath });
      artifacts.push(artifactReference(context, tracePath, "trace", "application/zip"));
      const video = session.page.video();
      await closeSession(session);
      owned = undefined;
      if (video) artifacts.push(artifactReference(context, await video.path(), "video", "video/webm"));
      return this.finish(failed ? "failed" : "passed", started, steps, errors, artifacts, logs);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Browser crashed";
      errors.push({ code: "ENGINE_ERROR", message });
      logs.push(message);
      if (sharedKey) await this.closeShared(sharedKey);
      return this.finish("failed", started, steps, errors, artifacts, logs);
    } finally {
      this.running.delete(context.jobId);
      if (owned) await closeSession(owned);
      if (sharedKey && context.signal.aborted) await this.closeShared(sharedKey);
    }
  }

  private async openSession(context: ExecutionContext, videoRoot: string, logs: string[]): Promise<Session> {
    const browser = await launchBrowser(context, logs);
    try {
      const videoDir = path.join(videoRoot, "videos");
      mkdirSync(videoDir, { recursive: true });
      const browserContext = await browser.newContext({
        baseURL: context.baseUrl,
        acceptDownloads: true,
        viewport: context.viewport ?? { width: 1280, height: 720 },
        recordVideo: { dir: videoDir, size: context.viewport ?? { width: 1280, height: 720 } },
      });
      await browserContext.tracing.start({ screenshots: true, snapshots: true });
      const page = await browserContext.newPage();
      page.setDefaultTimeout(context.timeoutMs);
      return { browser, context: browserContext, page, startedAt: Date.now() };
    } catch (error) {
      await browser.close().catch(() => undefined);
      throw error;
    }
  }

  private async sharedSession(context: ExecutionContext, logs: string[]) {
    const { key, directory } = context.session!;
    const existing = this.shared.get(key);
    if (existing && !existing.page.isClosed()) {
      clearTimeout(existing.idleTimer);
      existing.page.setDefaultTimeout(context.timeoutMs);
      logs.push("Continuing in the same browser as the previous test.");
      return existing;
    }
    if (existing) await this.closeShared(key);
    const session = await this.openSession(context, directory, logs);
    this.shared.set(key, session);
    logs.push("Opened a browser that the following tests in this run will share.");
    return session;
  }

  private async finishShared(key: string, context: ExecutionContext, logs: string[]): Promise<ArtifactReference[]> {
    const session = this.shared.get(key);
    if (!session) return [];
    this.shared.delete(key);
    clearTimeout(session.idleTimer);
    if (context.headed) await session.page.waitForTimeout(WATCH_END_PAUSE_MS).catch(() => undefined);
    const video = session.page.video();
    await session.context.tracing.stop().catch(() => undefined);
    await closeSession(session);
    if (!video) return [];
    logs.push("Saved the recording of the whole run.");
    return [artifactReference(context, await video.path(), "video", "video/webm")];
  }

  private scheduleIdleClose(key: string, session: Session) {
    clearTimeout(session.idleTimer);
    session.idleTimer = setTimeout(() => void this.closeShared(key), SHARED_IDLE_MS);
    session.idleTimer.unref();
  }

  private async closeShared(key: string) {
    const session = this.shared.get(key);
    if (!session) return;
    this.shared.delete(key);
    clearTimeout(session.idleTimer);
    await closeSession(session);
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

async function closeSession(session: Session) {
  await session.context.close().catch(() => undefined);
  await session.browser.close().catch(() => undefined);
}
