import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { createEnvironmentSchema, updateEnvironmentSchema } from "@atp/validation";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { EnvironmentsService } from "./environments.service";

@ApiTags("environments")
@Controller()
export class EnvironmentsController {
  constructor(private readonly environments: EnvironmentsService) {}

  @Get("projects/:projectId/environments")
  list(@Param("projectId") projectId: string) {
    return this.environments.list(projectId);
  }

  @Post("projects/:projectId/environments")
  create(
    @Param("projectId") projectId: string,
    @Body(new ZodValidationPipe(createEnvironmentSchema)) body: unknown,
  ) {
    return this.environments.create(projectId, body as Parameters<EnvironmentsService["create"]>[1]);
  }

  @Get("environments/:id")
  get(@Param("id") id: string) {
    return this.environments.get(id);
  }

  @Patch("environments/:id")
  update(@Param("id") id: string, @Body(new ZodValidationPipe(updateEnvironmentSchema)) body: unknown) {
    return this.environments.update(id, body as Parameters<EnvironmentsService["update"]>[1]);
  }

  @Delete("environments/:id")
  remove(@Param("id") id: string) {
    return this.environments.remove(id);
  }
}
