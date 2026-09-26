import { createReadStream } from "node:fs";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { HttpStatus, Injectable, StreamableFile } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Artifact as ArtifactView } from "@atp/shared-types";
import { Model } from "mongoose";
import { AppException } from "../../common/app.exception";
import { asObjectId } from "../../common/ids";
import { resolveInside } from "../../common/safe-path";
import { ArtifactDocument, ArtifactRecord, TestResult, TestRun } from "./execution.schemas";

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(TestRun.name) private readonly runs: Model<TestRun>,
    @InjectModel(TestResult.name) private readonly results: Model<TestResult>,
    @InjectModel(ArtifactRecord.name) private readonly artifacts: Model<ArtifactRecord>,
    private readonly config: ConfigService,
  ) {}

  async report(runId: string) {
    const run = await this.requireRun(runId);
    const results = await this.results.find({ runId: run._id }).sort({ createdAt: 1 });
    return {
      runId: run.id,
      status: run.status,
      total: run.total,
      passed: run.passed,
      failed: run.failed,
      skipped: run.skipped,
      cancelled: run.cancelled,
      durationMs: run.durationMs ?? 0,
      results: results.map((result) => ({
        id: result.id,
        testCaseId: result.testCaseId.toString(),
        status: result.status,
        durationMs: result.durationMs,
        steps: result.steps,
        error: result.error,
      })),
    };
  }

  async export(runId: string) {
    const report = await this.report(runId);
    const root = path.join(this.config.getOrThrow<string>("repoRoot"), "storage", "reports");
    mkdirSync(root, { recursive: true });
    const fileName = `${runId}.html`;
    const absolute = resolveInside(root, fileName);
    writeFileSync(absolute, renderHtml(report));
    return { fileName, relativePath: path.join("storage", "reports", fileName) };
  }

  async artifactsForResult(resultId: string): Promise<ArtifactView[]> {
    const result = await this.results.findById(asObjectId(resultId, "Result not found"));
    if (!result) throw new AppException("NOT_FOUND", "Result not found", HttpStatus.NOT_FOUND);
    const records = await this.artifacts.find({ _id: { $in: result.artifactIds } });
    return records.map((record) => this.present(record));
  }

  async open(id: string) {
    const record = await this.artifacts.findById(asObjectId(id, "Artifact not found"));
    if (!record) throw new AppException("NOT_FOUND", "Artifact not found", HttpStatus.NOT_FOUND);
    const absolute = resolveInside(this.config.getOrThrow<string>("ARTIFACT_ROOT"), record.relativePath);
    return {
      mimeType: record.mimeType,
      fileName: record.fileName,
      stream: new StreamableFile(createReadStream(absolute), {
        type: record.mimeType,
        disposition: `inline; filename="${record.fileName.replace(/"/g, "")}"`,
      }),
    };
  }

  private async requireRun(id: string) {
    const run = await this.runs.findById(asObjectId(id, "Run not found"));
    if (!run) throw new AppException("NOT_FOUND", "Run not found", HttpStatus.NOT_FOUND);
    return run;
  }

  private present(record: ArtifactDocument): ArtifactView {
    return {
      id: record.id,
      projectId: record.projectId.toString(),
      runId: record.runId.toString(),
      resultId: record.resultId?.toString(),
      type: record.type,
      fileName: record.fileName,
      relativePath: record.relativePath,
      mimeType: record.mimeType,
      sizeBytes: record.sizeBytes,
      createdAt: record.createdAt.toISOString(),
    };
  }
}

function renderHtml(report: {
  runId: string;
  status: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  cancelled: number;
  durationMs: number;
  results: { testCaseId: string; status: string; durationMs: number; error?: { message: string } }[];
}) {
  const rows = report.results
    .map(
      (result) =>
        `<tr><td>${escapeHtml(result.testCaseId)}</td><td>${escapeHtml(result.status)}</td><td>${result.durationMs}</td><td>${escapeHtml(result.error?.message ?? "")}</td></tr>`,
    )
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Run ${escapeHtml(report.runId)}</title></head><body><h1>Run ${escapeHtml(report.status)}</h1><p>Total ${report.total}, passed ${report.passed}, failed ${report.failed}, skipped ${report.skipped}, cancelled ${report.cancelled}, ${report.durationMs} ms</p><table><thead><tr><th>Case</th><th>Status</th><th>Duration</th><th>Error</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}
