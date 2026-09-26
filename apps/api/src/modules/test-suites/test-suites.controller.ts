import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { createTestSuiteSchema, updateTestSuiteSchema } from "@atp/validation";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { TestSuitesService } from "./test-suites.service";

@ApiTags("test-suites")
@Controller()
export class TestSuitesController {
  constructor(private readonly suites: TestSuitesService) {}

  @Get("projects/:projectId/test-suites")
  list(@Param("projectId") projectId: string) {
    return this.suites.list(projectId);
  }

  @Post("projects/:projectId/test-suites")
  create(@Param("projectId") projectId: string, @Body(new ZodValidationPipe(createTestSuiteSchema)) body: unknown) {
    return this.suites.create(projectId, body as Parameters<TestSuitesService["create"]>[1]);
  }

  @Get("test-suites/:id")
  get(@Param("id") id: string) {
    return this.suites.get(id);
  }

  @Patch("test-suites/:id")
  update(@Param("id") id: string, @Body(new ZodValidationPipe(updateTestSuiteSchema)) body: unknown) {
    return this.suites.update(id, body as Parameters<TestSuitesService["update"]>[1]);
  }

  @Delete("test-suites/:id")
  remove(@Param("id") id: string) {
    return this.suites.remove(id);
  }
}
