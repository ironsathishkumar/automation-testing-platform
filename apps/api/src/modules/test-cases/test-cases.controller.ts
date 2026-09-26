import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { createTestCaseSchema, updateTestCaseSchema } from "@atp/validation";
import { AuthUser, CurrentUser } from "../../common/current-user.decorator";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { TestCasesService } from "./test-cases.service";

@ApiTags("test-cases")
@Controller()
export class TestCasesController {
  constructor(private readonly testCases: TestCasesService) {}

  @Get("projects/:projectId/test-cases")
  list(@Param("projectId") projectId: string) {
    return this.testCases.list(projectId);
  }

  @Post("projects/:projectId/test-cases")
  create(
    @Param("projectId") projectId: string,
    @Body(new ZodValidationPipe(createTestCaseSchema)) body: unknown,
    @CurrentUser() user: AuthUser,
  ) {
    return this.testCases.create(projectId, body as Parameters<TestCasesService["create"]>[1], user.id);
  }

  @Get("test-cases/:id")
  get(@Param("id") id: string) {
    return this.testCases.get(id);
  }

  @Patch("test-cases/:id")
  update(@Param("id") id: string, @Body(new ZodValidationPipe(updateTestCaseSchema)) body: unknown) {
    return this.testCases.update(id, body as Parameters<TestCasesService["update"]>[1]);
  }

  @Delete("test-cases/:id")
  remove(@Param("id") id: string) {
    return this.testCases.remove(id);
  }

  @Post("test-cases/:id/validate")
  @HttpCode(200)
  validate(@Param("id") id: string) {
    return this.testCases.validate(id);
  }
}
