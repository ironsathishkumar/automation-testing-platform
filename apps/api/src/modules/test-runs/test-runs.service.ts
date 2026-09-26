import { mkdirSync } from "node:fs";
import path from "node:path";
import { HttpStatus, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { EngineResult } from "@atp/engine-contracts";
import { ExecutionLogEntry, TestResult as TestResultView, TestRun as TestRunView } from "@atp/shared-types";
import { CreateRunInput } from "@atp/validation";
import { Model, Types } from "mongoose";
import { AppException } from "../../common/app.exception";
import { asObjectId } from "../../common/ids";
import { resolveInside } from "../../common/safe-path";
import { EngineRegistry } from "../../engines/engine-registry";
import { Application } from "../applications/application.schema";
import { Environment } from "../environments/environment.schema";
import { ProjectsService } from "../projects/projects.service";
import { TestCase } from "../test-cases/test-case.schema";
import { TestPlan } from "../test-plans/test-plan.schema";
import { TestSuite } from "../test-suites/test-suite.schema";
import { ArtifactRecord, ExecutionJob, ExecutionJobDocument, ExecutionLog, TestResult, TestResultDocument, TestRun, TestRunDocument } from "./execution.schemas";
import { jobVariant, matrixCombinations, readViewport } from "./run-matrix";
import { summarizeResults } from "./run-status";

const CONCURRENCY = 2;

@Injectable()
export class TestRunsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TestRunsService.name);
  private timer?: NodeJS.Timeout;
  private active = 0;

  constructor(
    @InjectModel(TestRun.name) private readonly runs: Model<TestRun>,
    @InjectModel(ExecutionJob.name) private readonly jobs: Model<ExecutionJob>,
    @InjectModel(TestResult.name) private readonly results: Model<TestResult>,
    @InjectModel(ArtifactRecord.name) private readonly artifacts: Model<ArtifactRecord>,
    @InjectModel(ExecutionLog.name) private readonly logs: Model<ExecutionLog>,
    @InjectModel(TestCase.name) private readonly testCases: Model<TestCase>,
    @InjectModel(TestSuite.name) private readonly suites: Model<TestSuite>,
    @InjectModel(TestPlan.name) private readonly plans: Model<TestPlan>,
    @InjectModel(Environment.name) private readonly environments: Model<Environment>,
    @InjectModel(Application.name) private readonly applications: Model<Application>,
    private readonly projects: ProjectsService,
    private readonly registry: EngineRegistry,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.pump();
    }, 1000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async create(input: CreateRunInput, userId: string): Promise<TestRunView> {
    await this.projects.ensure(input.projectId);
    const selection = await this.selectCases(input);
    const run = await this.runs.create({
      projectId: asObjectId(input.projectId),
      planId: input.planId ? asObjectId(input.planId) : undefined,
      suiteId: input.suiteId ? asObjectId(input.suiteId) : undefined,
      status: "queued",
      executionMode: selection.executionMode,
      retryCount: selection.retryCount,
      total: selection.cases.length * selection.matrices.length,
      triggeredBy: new Types.ObjectId(userId),
    });
    const jobs = selection.cases.flatMap((testCase) =>
      selection.matrices.map((matrix) => ({
        runId: run._id,
        testCaseId: testCase._id,
        engineType: testCase.engineType,
        status: "queued" as const,
        attempt: 1,
        payload: {
          environmentId: (input.environmentId ?? selection.environmentId ?? testCase.environmentId?.toString()) || undefined,
          retryCount: selection.retryCount,
          browser: matrix.browser,
          viewport: matrix.viewport,
        },
      })),
    );
    await this.jobs.insertMany(jobs);
    await this.log(run.id, "info", `Queued ${jobs.length} job(s)`);
    return this.presentRun(run);
  }

  async list(projectId?: string): Promise<TestRunView[]> {
    const filter = projectId ? { projectId: asObjectId(projectId) } : {};
    const runs = await this.runs.find(filter).sort({ createdAt: -1 }).limit(100);
    return runs.map((run) => this.presentRun(run));
  }

  async get(id: string): Promise<TestRunView> {
    return this.presentRun(await this.findRun(id));
  }

  async resultsFor(runId: string): Promise<TestResultView[]> {
    await this.findRun(runId);
    const records = await this.results.find({ runId: asObjectId(runId) }).sort({ createdAt: 1 });
    return records.map((record) => this.presentResult(record));
  }

  async result(id: string): Promise<TestResultView> {
    const record = await this.results.findById(asObjectId(id, "Result not found"));
    if (!record) throw new AppException("NOT_FOUND", "Result not found", HttpStatus.NOT_FOUND);
    return this.presentResult(record);
  }

  async logsFor(runId: string): Promise<ExecutionLogEntry[]> {
    await this.findRun(runId);
    const records = await this.logs.find({ runId: asObjectId(runId) }).sort({ createdAt: 1 });
    return records.map((record) => ({
      id: record.id,
      runId: record.runId.toString(),
      jobId: record.jobId?.toString(),
      testCaseId: record.testCaseId?.toString(),
      level: record.level,
      message: record.message,
      createdAt: record.createdAt.toISOString(),
    }));
  }

  async cancel(id: string) {
    const run = await this.findRun(id);
    run.cancelRequested = true;
    run.status = "cancelled";
    run.completedAt = new Date();
    await run.save();
    const running = await this.jobs.find({ runId: run._id, status: "running" });
    running.forEach((job) => this.registry.cancel(job.id));
    await this.jobs.updateMany({ runId: run._id, status: "queued" }, { status: "cancelled", completedAt: new Date() });
    await this.log(run.id, "warn", "Cancellation requested");
    await this.refresh(run.id);
    return this.presentRun(await this.findRun(id));
  }

  async retry(id: string) {
    const run = await this.findRun(id);
    if (run.cancelRequested) {
      throw new AppException("CONFLICT", "A cancelled run cannot be retried", HttpStatus.CONFLICT);
    }
    const failed = await this.results.find({ runId: run._id, status: "failed" });
    if (failed.length === 0) {
      throw new AppException("VALIDATION_ERROR", "There are no failed tests to retry", HttpStatus.BAD_REQUEST);
    }
    await this.enqueueAttempts(run, failed.map((result) => result.testCaseId.toString()));
    run.status = "queued";
    run.completedAt = undefined;
    await run.save();
    await this.log(run.id, "info", `Retry queued for ${failed.length} failed test(s)`);
    return this.presentRun(run);
  }

  async rerunFailed(id: string, userId: string) {
    const run = await this.findRun(id);
    const failed = await this.results.find({ runId: run._id, status: "failed" });
    if (failed.length === 0) {
      throw new AppException("VALIDATION_ERROR", "There are no failed tests to re-run", HttpStatus.BAD_REQUEST);
    }
    const sourceJobs = await this.jobs.find({ runId: run._id, testCaseId: { $in: failed.map((result) => result.testCaseId) } });
    const environmentId = typeof sourceJobs[0]?.payload.environmentId === "string" ? sourceJobs[0].payload.environmentId : undefined;
    const next = await this.runs.create({
      projectId: run.projectId,
      planId: run.planId,
      suiteId: run.suiteId,
      status: "queued",
      executionMode: run.executionMode,
      retryCount: run.retryCount,
      total: failed.length,
      triggeredBy: new Types.ObjectId(userId),
    });
    await this.jobs.insertMany(
      failed.map((result) => {
        const previous = sourceJobs.find((job) => job.testCaseId?.toString() === result.testCaseId.toString());
        return {
          runId: next._id,
          testCaseId: result.testCaseId,
          engineType: previous?.engineType ?? "web",
          status: "queued",
          attempt: 1,
          payload: previous?.payload ?? { environmentId },
        };
      }),
    );
    await this.log(next.id, "info", `Re-run created from ${run.id}`);
    return this.presentRun(next);
  }

  private async pump() {
    while (this.active < CONCURRENCY) {
      const job = await this.claim();
      if (!job) return;
      this.active += 1;
      void this.execute(job).finally(() => {
        this.active -= 1;
      });
    }
  }

  private async claim() {
    const running = await this.jobs.find({ status: "running" }).select("runId");
    const busyRunIds = running.map((job) => job.runId);
    const sequential = busyRunIds.length
      ? await this.runs.find({ _id: { $in: busyRunIds }, executionMode: "sequential" }).select("_id")
      : [];
    return this.jobs.findOneAndUpdate(
      { status: "queued", runId: { $nin: sequential.map((run) => run._id) } },
      { status: "running", startedAt: new Date() },
      { sort: { createdAt: 1 }, new: true },
    );
  }

  private async execute(job: ExecutionJobDocument) {
    const run = await this.runs.findById(job.runId);
    if (!run) return;
    if (run.cancelRequested) {
      job.status = "cancelled";
      job.completedAt = new Date();
      await job.save();
      await this.refresh(run.id);
      return;
    }
    if (!run.startedAt) {
      run.startedAt = new Date();
      run.status = "running";
      await run.save();
    }
    const signal = this.registry.begin(job.id);
    try {
      const outcome = await this.runEngine(run, job, signal);
      await this.persist(run, job, outcome);
      job.status = outcome.status === "cancelled" ? "cancelled" : outcome.status === "failed" ? "failed" : "completed";
    } catch (error) {
      const message = error instanceof Error ? error.message : "Worker crashed";
      this.logger.error(message);
      await this.persist(run, job, {
        status: "failed",
        durationMs: 0,
        steps: [],
        errors: [{ code: "EXECUTION_ERROR", message }],
        artifacts: [],
        logs: [message],
      });
      job.status = "failed";
    } finally {
      this.registry.finish(job.id);
      job.completedAt = new Date();
      await job.save();
      await this.maybeRetry(run, job);
      await this.refresh(run.id);
    }
  }

  private async runEngine(run: TestRunDocument, job: ExecutionJobDocument, signal: AbortSignal): Promise<EngineResult> {
    const testCase = await this.testCases.findById(job.testCaseId);
    if (!testCase) {
      return this.failedResult("NOT_FOUND", "Test case no longer exists");
    }
    const application = await this.applications.findById(testCase.applicationId);
    const environmentId = typeof job.payload.environmentId === "string" ? job.payload.environmentId : undefined;
    const environment = environmentId ? await this.environments.findById(environmentId) : null;
    const variables: Record<string, string> = {};
    for (const variable of environment?.variables ?? []) {
      if (!variable.isSecret) variables[variable.key] = variable.value;
      else variables[variable.key] = variable.value;
    }
    const artifactRoot = this.config.getOrThrow<string>("ARTIFACT_ROOT");
    const directory = resolveInside(artifactRoot, run.projectId.toString(), run.id, job.id);
    mkdirSync(directory, { recursive: true });
    const engine = this.registry.get(job.engineType);
    if (!engine) {
      return this.failedResult("ENGINE_ERROR", `No engine is registered for ${job.engineType}`);
    }
    const browser = typeof job.payload.browser === "string" ? job.payload.browser : environment?.settings.browser;
    const viewport = readViewport(job.payload.viewport);
    const timeoutMs = typeof environment?.settings.timeoutMs === "number" ? environment.settings.timeoutMs : 30000;
    await this.log(run.id, "info", `Started ${testCase.key}`, job.id, testCase.id);
    return engine.execute({
      runId: run.id,
      jobId: job.id,
      testId: testCase.id,
      projectId: run.projectId.toString(),
      environmentId,
      variables,
      artifactDirectory: directory,
      timeoutMs,
      baseUrl: environment?.baseUrl ?? application?.baseUrl,
      apiBaseUrl: environment?.apiBaseUrl ?? application?.apiBaseUrl,
      browser: typeof browser === "string" ? browser : "chromium",
      viewport,
      steps: testCase.steps.map((step) => ({
        id: step.id,
        order: step.order,
        action: step.action,
        target: step.target,
        value: step.value,
        assertion: step.assertion,
        timeoutMs: step.timeoutMs,
      })),
      signal,
    });
  }

  private async persist(run: TestRunDocument, job: ExecutionJobDocument, outcome: EngineResult) {
    const artifactRoot = this.config.getOrThrow<string>("ARTIFACT_ROOT");
    const savedArtifacts = [];
    for (const artifact of outcome.artifacts) {
      const absolute = resolveInside(artifactRoot, artifact.relativePath);
      if (!absolute.startsWith(path.resolve(artifactRoot))) continue;
      savedArtifacts.push(
        await this.artifacts.create({
          projectId: run.projectId,
          runId: run._id,
          type: artifact.type,
          fileName: artifact.fileName,
          relativePath: artifact.relativePath,
          mimeType: artifact.mimeType,
          sizeBytes: artifact.sizeBytes,
        }),
      );
    }
    const result = await this.results.create({
      runId: run._id,
      testCaseId: job.testCaseId,
      status: outcome.status,
      durationMs: outcome.durationMs,
      steps: outcome.steps,
      error: outcome.errors[0],
      artifactIds: savedArtifacts.map((artifact) => artifact._id),
      metrics: outcome.metrics,
      attempt: job.attempt,
      variant: jobVariant(job.testCaseId?.toString() ?? "", job.payload),
    });
    if (savedArtifacts.length > 0) {
      await this.artifacts.updateMany({ _id: { $in: savedArtifacts.map((artifact) => artifact._id) } }, { resultId: result._id });
    }
    for (const message of outcome.logs) {
      await this.log(run.id, outcome.status === "failed" ? "error" : "info", message, job.id, job.testCaseId?.toString());
    }
    await this.log(run.id, "info", `Completed with ${outcome.status}`, job.id, job.testCaseId?.toString());
  }

  private async maybeRetry(run: TestRunDocument, job: ExecutionJobDocument) {
    if (job.status !== "failed" || run.cancelRequested) return;
    const limit = typeof job.payload.retryCount === "number" ? job.payload.retryCount : run.retryCount;
    if (job.attempt > limit) return;
    await this.jobs.create({
      runId: run._id,
      testCaseId: job.testCaseId,
      engineType: job.engineType,
      status: "queued",
      attempt: job.attempt + 1,
      payload: job.payload,
    });
    await this.log(run.id, "warn", `Retry ${job.attempt + 1} queued`, undefined, job.testCaseId?.toString());
  }

  private async enqueueAttempts(run: TestRunDocument, testCaseIds: string[]) {
    const latest = await this.jobs.find({ runId: run._id, testCaseId: { $in: testCaseIds.map((id) => asObjectId(id)) } });
    await this.jobs.insertMany(
      testCaseIds.map((testCaseId) => {
        const previous = latest.filter((job) => job.testCaseId?.toString() === testCaseId).sort((a, b) => b.attempt - a.attempt)[0];
        return {
          runId: run._id,
          testCaseId: asObjectId(testCaseId),
          engineType: previous?.engineType ?? "web",
          status: "queued",
          attempt: (previous?.attempt ?? 1) + 1,
          payload: previous?.payload ?? {},
        };
      }),
    );
  }

  private async refresh(runId: string) {
    const run = await this.runs.findById(runId);
    if (!run) return;
    const [pending, records] = await Promise.all([
      this.jobs.countDocuments({ runId: run._id, status: { $in: ["queued", "running"] } }),
      this.results.find({ runId: run._id }).sort({ createdAt: 1 }),
    ]);
    const latest = new Map<string, TestResultDocument>();
    for (const record of records) latest.set(record.variant || record.testCaseId.toString(), record);
    const summary = summarizeResults([...latest.values()].map((record) => record.status), pending);
    run.passed = summary.passed;
    run.failed = summary.failed;
    run.skipped = summary.skipped;
    run.cancelled = summary.cancelled;
    run.total = Math.max(run.total, latest.size);
    if (run.cancelRequested && pending === 0) run.status = "cancelled";
    else run.status = summary.status;
    if (pending === 0) {
      run.completedAt = run.completedAt ?? new Date();
      run.durationMs = run.startedAt ? run.completedAt.getTime() - run.startedAt.getTime() : 0;
    }
    await run.save();
  }

  private async selectCases(input: CreateRunInput) {
    if (input.testCaseId) {
      const testCase = await this.testCases.findById(asObjectId(input.testCaseId, "Test case not found"));
      if (!testCase || testCase.projectId.toString() !== input.projectId) {
        throw new AppException("NOT_FOUND", "Test case not found", HttpStatus.NOT_FOUND);
      }
      return { cases: [testCase], executionMode: "sequential" as const, retryCount: 0, environmentId: input.environmentId, matrices: matrixCombinations() };
    }
    if (input.suiteId) {
      const suite = await this.suites.findById(asObjectId(input.suiteId, "Test suite not found"));
      if (!suite || suite.projectId.toString() !== input.projectId) {
        throw new AppException("NOT_FOUND", "Test suite not found", HttpStatus.NOT_FOUND);
      }
      const cases = await this.orderedCases(input.projectId, suite.testCaseIds.map((id) => id.toString()));
      return { cases, executionMode: suite.executionMode, retryCount: suite.retryCount, environmentId: input.environmentId, matrices: matrixCombinations() };
    }
    const plan = await this.plans.findById(asObjectId(input.planId ?? "", "Test plan not found"));
    if (!plan || plan.projectId.toString() !== input.projectId) {
      throw new AppException("NOT_FOUND", "Test plan not found", HttpStatus.NOT_FOUND);
    }
    const suites = await this.suites.find({ _id: { $in: plan.suiteIds }, projectId: plan.projectId });
    const ids = suites.flatMap((suite) => suite.testCaseIds.map((id) => id.toString()));
    const cases = await this.orderedCases(input.projectId, ids);
    return {
      cases,
      executionMode: "sequential" as const,
      retryCount: Math.max(0, ...suites.map((suite) => suite.retryCount)),
      environmentId: input.environmentId ?? plan.environmentId?.toString(),
      matrices: matrixCombinations(plan.browserConfig),
    };
  }

  private async orderedCases(projectId: string, ids: string[]) {
    const records = await this.testCases.find({ projectId: asObjectId(projectId), _id: { $in: ids.map((id) => asObjectId(id)) } });
    const byId = new Map(records.map((record) => [record.id, record]));
    const ordered = ids.map((id) => byId.get(id)).filter((record) => record !== undefined);
    if (ordered.length === 0) {
      throw new AppException("VALIDATION_ERROR", "The selection has no test cases", HttpStatus.BAD_REQUEST);
    }
    return ordered;
  }

  private failedResult(code: string, message: string): EngineResult {
    return { status: "failed", durationMs: 0, steps: [], errors: [{ code, message }], artifacts: [], logs: [message] };
  }

  private async findRun(id: string) {
    const run = await this.runs.findById(asObjectId(id, "Run not found"));
    if (!run) throw new AppException("NOT_FOUND", "Run not found", HttpStatus.NOT_FOUND);
    return run;
  }

  private async log(runId: string, level: "error" | "warn" | "info" | "debug", message: string, jobId?: string, testCaseId?: string) {
    await this.logs.create({
      runId: asObjectId(runId),
      jobId: jobId ? asObjectId(jobId) : undefined,
      testCaseId: testCaseId ? asObjectId(testCaseId) : undefined,
      level,
      message,
    });
  }

  private presentRun(run: TestRunDocument): TestRunView {
    return {
      id: run.id,
      projectId: run.projectId.toString(),
      planId: run.planId?.toString(),
      suiteId: run.suiteId?.toString(),
      status: run.status,
      startedAt: run.startedAt?.toISOString(),
      completedAt: run.completedAt?.toISOString(),
      durationMs: run.durationMs,
      total: run.total,
      passed: run.passed,
      failed: run.failed,
      skipped: run.skipped,
      cancelled: run.cancelled,
      triggeredBy: run.triggeredBy.toString(),
      createdAt: run.createdAt.toISOString(),
    };
  }

  private presentResult(record: TestResultDocument): TestResultView {
    return {
      id: record.id,
      runId: record.runId.toString(),
      testCaseId: record.testCaseId.toString(),
      status: record.status,
      durationMs: record.durationMs,
      steps: record.steps.map((step) => ({
        id: step.id,
        order: step.order,
        action: step.action,
        status: step.status as TestResultView["status"],
        durationMs: step.durationMs,
        message: step.message,
        error: step.error,
      })),
      error: record.error,
      artifactIds: record.artifactIds.map((id) => id.toString()),
      metrics: record.metrics,
      variant: record.variant,
      createdAt: record.createdAt.toISOString(),
    };
  }
}
