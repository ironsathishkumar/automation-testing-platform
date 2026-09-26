import { Body, Controller, Get, Header, HttpCode, Param, Post, Query, StreamableFile } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { createRunSchema } from "@atp/validation";
import { AuthUser, CurrentUser } from "../../common/current-user.decorator";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { EngineRegistry } from "../../engines/engine-registry";
import { ReportsService } from "./reports.service";
import { TestRunsService } from "./test-runs.service";

@ApiTags("test-runs")
@Controller()
export class TestRunsController {
  constructor(
    private readonly runs: TestRunsService,
    private readonly registry: EngineRegistry,
    private readonly reports: ReportsService,
  ) {}

  @Get("engines")
  engines() {
    return this.registry.list();
  }

  @Post("test-runs")
  create(@Body(new ZodValidationPipe(createRunSchema)) body: unknown, @CurrentUser() user: AuthUser) {
    return this.runs.create(body as Parameters<TestRunsService["create"]>[0], user.id);
  }

  @Get("test-runs")
  list(@Query("projectId") projectId?: string) {
    return this.runs.list(projectId);
  }

  @Get("test-runs/:id")
  get(@Param("id") id: string) {
    return this.runs.get(id);
  }

  @Get("test-runs/:id/results")
  results(@Param("id") id: string) {
    return this.runs.resultsFor(id);
  }

  @Get("test-runs/:id/logs")
  logs(@Param("id") id: string) {
    return this.runs.logsFor(id);
  }

  @Post("test-runs/:id/cancel")
  @HttpCode(200)
  cancel(@Param("id") id: string) {
    return this.runs.cancel(id);
  }

  @Post("test-runs/:id/retry")
  @HttpCode(200)
  retry(@Param("id") id: string) {
    return this.runs.retry(id);
  }

  @Post("test-runs/:id/rerun-failed")
  rerunFailed(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.runs.rerunFailed(id, user.id);
  }

  @Get("test-results/:id")
  result(@Param("id") id: string) {
    return this.runs.result(id);
  }

  @Get("test-results/:id/artifacts")
  resultArtifacts(@Param("id") id: string) {
    return this.reports.artifactsForResult(id);
  }

  @Get("artifacts/:id")
  async artifact(@Param("id") id: string): Promise<StreamableFile> {
    const file = await this.reports.open(id);
    return file.stream;
  }

  @Get("test-runs/:runId/report")
  report(@Param("runId") runId: string) {
    return this.reports.report(runId);
  }

  @Post("test-runs/:runId/report/export")
  @HttpCode(200)
  @Header("content-type", "application/json")
  export(@Param("runId") runId: string) {
    return this.reports.export(runId);
  }
}
