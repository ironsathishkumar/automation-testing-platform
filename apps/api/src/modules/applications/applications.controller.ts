import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { createApplicationSchema, updateApplicationSchema } from "@atp/validation";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { ApplicationsService } from "./applications.service";

@ApiTags("applications")
@Controller()
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Get("projects/:projectId/applications")
  list(@Param("projectId") projectId: string) {
    return this.applications.list(projectId);
  }

  @Post("projects/:projectId/applications")
  create(
    @Param("projectId") projectId: string,
    @Body(new ZodValidationPipe(createApplicationSchema)) body: unknown,
  ) {
    return this.applications.create(projectId, body as Parameters<ApplicationsService["create"]>[1]);
  }

  @Get("applications/:id")
  get(@Param("id") id: string) {
    return this.applications.get(id);
  }

  @Patch("applications/:id")
  update(@Param("id") id: string, @Body(new ZodValidationPipe(updateApplicationSchema)) body: unknown) {
    return this.applications.update(id, body as Parameters<ApplicationsService["update"]>[1]);
  }

  @Delete("applications/:id")
  remove(@Param("id") id: string) {
    return this.applications.remove(id);
  }
}
