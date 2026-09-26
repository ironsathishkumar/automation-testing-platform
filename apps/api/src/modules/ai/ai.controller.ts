import { Body, Controller, Get, HttpCode, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { aiPromptSchema, aiTestSchema, GenerateDocumentTestsInput, generateDocumentTestsSchema } from "@atp/validation";
import { AuthUser, CurrentUser } from "../../common/current-user.decorator";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { AiService } from "./ai.service";

@ApiTags("ai")
@Controller()
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Get("projects/:projectId/ai/requests")
  list(@Param("projectId") projectId: string) {
    return this.ai.list(projectId);
  }

  @Get("ai/status")
  status() {
    return this.ai.status();
  }

  @Post("files/:id/generate-tests")
  @HttpCode(200)
  generateFromDocument(@Param("id") id: string, @Body(new ZodValidationPipe(generateDocumentTestsSchema)) body: unknown, @CurrentUser() user: AuthUser) {
    return this.ai.generateFromDocument(id, body as GenerateDocumentTestsInput, user.id);
  }

  @Post("projects/:projectId/ai/scenarios")
  @HttpCode(200)
  scenarios(@Param("projectId") projectId: string, @Body(new ZodValidationPipe(aiPromptSchema)) body: unknown, @CurrentUser() user: AuthUser) {
    return this.ai.scenarios(projectId, body as Parameters<AiService["scenarios"]>[1], user.id);
  }

  @Post("projects/:projectId/ai/tests")
  @HttpCode(200)
  tests(@Param("projectId") projectId: string, @Body(new ZodValidationPipe(aiTestSchema)) body: unknown, @CurrentUser() user: AuthUser) {
    return this.ai.tests(projectId, body as Parameters<AiService["tests"]>[1], user.id);
  }

  @Post("projects/:projectId/ai/suggestions")
  @HttpCode(200)
  suggestions(@Param("projectId") projectId: string, @Body(new ZodValidationPipe(aiPromptSchema)) body: unknown, @CurrentUser() user: AuthUser) {
    return this.ai.suggestions(projectId, body as Parameters<AiService["suggestions"]>[1], user.id);
  }

  @Post("test-results/:id/analyze")
  @HttpCode(200)
  analyze(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.ai.analyze(id, user.id);
  }

  @Post("ai/requests/:id/approve")
  @HttpCode(200)
  approve(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.ai.approve(id, user.id);
  }
}
