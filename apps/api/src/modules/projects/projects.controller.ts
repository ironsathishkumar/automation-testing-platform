import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { createProjectSchema, updateProjectSchema } from "@atp/validation";
import { AuthUser, CurrentUser } from "../../common/current-user.decorator";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { ProjectsService } from "./projects.service";

@ApiTags("projects")
@Controller("projects")
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  list() {
    return this.projects.list();
  }

  @Post()
  create(@Body(new ZodValidationPipe(createProjectSchema)) body: unknown, @CurrentUser() user: AuthUser) {
    return this.projects.create(body as Parameters<ProjectsService["create"]>[0], user.id);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.projects.get(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body(new ZodValidationPipe(updateProjectSchema)) body: unknown) {
    return this.projects.update(id, body as Parameters<ProjectsService["update"]>[1]);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.projects.remove(id, user.id);
  }
}
