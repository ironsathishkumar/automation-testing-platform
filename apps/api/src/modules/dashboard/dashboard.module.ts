import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Application, ApplicationSchema } from "../applications/application.schema";
import { Environment, EnvironmentSchema } from "../environments/environment.schema";
import { Project, ProjectSchema } from "../projects/project.schema";
import { TestCase, TestCaseSchema } from "../test-cases/test-case.schema";
import { TestPlan, TestPlanSchema } from "../test-plans/test-plan.schema";
import { TestSuite, TestSuiteSchema } from "../test-suites/test-suite.schema";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Project.name, schema: ProjectSchema },
      { name: Application.name, schema: ApplicationSchema },
      { name: Environment.name, schema: EnvironmentSchema },
      { name: TestCase.name, schema: TestCaseSchema },
      { name: TestSuite.name, schema: TestSuiteSchema },
      { name: TestPlan.name, schema: TestPlanSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
