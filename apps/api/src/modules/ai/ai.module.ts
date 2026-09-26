import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ApplicationsModule } from "../applications/applications.module";
import { ProjectFilesModule } from "../project-files/project-files.module";
import { ProjectsModule } from "../projects/projects.module";
import { TestCasesModule } from "../test-cases/test-cases.module";
import { TestResult, TestResultSchema, TestRun, TestRunSchema } from "../test-runs/execution.schemas";
import { AiRequest, AiRequestSchema } from "./ai-request.schema";
import { AiSettings, AiSettingsSchema } from "./ai-settings.schema";
import { AiSettingsService } from "./ai-settings.service";
import { AiController } from "./ai.controller";
import { AiProvider } from "./ai.provider";
import { AiService } from "./ai.service";

@Module({
  imports: [
    ProjectsModule,
    ApplicationsModule,
    TestCasesModule,
    ProjectFilesModule,
    MongooseModule.forFeature([
      { name: AiRequest.name, schema: AiRequestSchema },
      { name: TestRun.name, schema: TestRunSchema },
      { name: TestResult.name, schema: TestResultSchema },
      { name: AiSettings.name, schema: AiSettingsSchema },
    ]),
  ],
  controllers: [AiController],
  providers: [AiSettingsService, AiProvider, AiService],
})
export class AiModule {}
