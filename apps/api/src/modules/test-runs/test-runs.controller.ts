import { Body, Controller, Get, HttpCode, Param, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { createRunSchema } from "@atp/validation";
import { AuthUser, CurrentUser } from "../../common/current-user.decorator";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { EngineRegistry } from "../../engines/engine-registry";
import { TestRunsService } from "./test-runs.service";

@ApiTags("test-runs")
@Controller()
export class TestRunsController {
  constructor(
    private readonly runs: TestRunsService,
    private readonly registry: EngineRegistry,
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
}
