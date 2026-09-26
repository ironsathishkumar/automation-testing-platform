import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Application, ApplicationSchema } from "../applications/application.schema";
import { Environment, EnvironmentSchema } from "../environments/environment.schema";
import { ProjectsModule } from "../projects/projects.module";
import { TestCase, TestCaseSchema } from "../test-cases/test-case.schema";
import { TestPlan, TestPlanSchema } from "../test-plans/test-plan.schema";
import { TestSuite, TestSuiteSchema } from "../test-suites/test-suite.schema";
import { ArtifactRecord, ArtifactSchema, ExecutionJob, ExecutionJobSchema, ExecutionLog, ExecutionLogSchema, TestResult, TestResultSchema, TestRun, TestRunSchema } from "./execution.schemas";
import { TestRunsController } from "./test-runs.controller";
import { TestRunsService } from "./test-runs.service";

@Module({
  imports: [
    ProjectsModule,
    MongooseModule.forFeature([
      { name: TestRun.name, schema: TestRunSchema },
      { name: ExecutionJob.name, schema: ExecutionJobSchema },
      { name: TestResult.name, schema: TestResultSchema },
      { name: ArtifactRecord.name, schema: ArtifactSchema },
      { name: ExecutionLog.name, schema: ExecutionLogSchema },
      { name: TestCase.name, schema: TestCaseSchema },
      { name: TestSuite.name, schema: TestSuiteSchema },
      { name: TestPlan.name, schema: TestPlanSchema },
      { name: Environment.name, schema: EnvironmentSchema },
      { name: Application.name, schema: ApplicationSchema },
    ]),
  ],
  controllers: [TestRunsController],
  providers: [TestRunsService],
  exports: [TestRunsService],
})
export class TestRunsModule {}
