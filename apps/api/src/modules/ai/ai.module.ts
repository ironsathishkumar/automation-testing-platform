import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ApplicationsModule } from "../applications/applications.module";
import { ProjectsModule } from "../projects/projects.module";
import { TestCasesModule } from "../test-cases/test-cases.module";
import { TestResult, TestResultSchema, TestRun, TestRunSchema } from "../test-runs/execution.schemas";
import { AiRequest, AiRequestSchema } from "./ai-request.schema";
import { AiController } from "./ai.controller";
import { AiProvider } from "./ai.provider";
import { AiService } from "./ai.service";

@Module({
  imports: [
    ProjectsModule,
    ApplicationsModule,
    TestCasesModule,
    MongooseModule.forFeature([
      { name: AiRequest.name, schema: AiRequestSchema },
      { name: TestRun.name, schema: TestRunSchema },
      { name: TestResult.name, schema: TestResultSchema },
    ]),
  ],
  controllers: [AiController],
  providers: [AiProvider, AiService],
})
export class AiModule {}
