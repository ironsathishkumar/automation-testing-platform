import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { createTestPlanSchema, updateTestPlanSchema } from "@atp/validation";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { TestPlansService } from "./test-plans.service";

@ApiTags("test-plans")
@Controller()
export class TestPlansController {
  constructor(private readonly plans: TestPlansService) {}

  @Get("projects/:projectId/test-plans")
  list(@Param("projectId") projectId: string) {
    return this.plans.list(projectId);
  }

  @Post("projects/:projectId/test-plans")
  create(@Param("projectId") projectId: string, @Body(new ZodValidationPipe(createTestPlanSchema)) body: unknown) {
    return this.plans.create(projectId, body as Parameters<TestPlansService["create"]>[1]);
  }

  @Get("test-plans/:id")
  get(@Param("id") id: string) {
    return this.plans.get(id);
  }

  @Patch("test-plans/:id")
  update(@Param("id") id: string, @Body(new ZodValidationPipe(updateTestPlanSchema)) body: unknown) {
    return this.plans.update(id, body as Parameters<TestPlansService["update"]>[1]);
  }

  @Delete("test-plans/:id")
  remove(@Param("id") id: string) {
    return this.plans.remove(id);
  }
}
