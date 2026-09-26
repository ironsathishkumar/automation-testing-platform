import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { EnvironmentsModule } from "../environments/environments.module";
import { ProjectsModule } from "../projects/projects.module";
import { TestSuitesModule } from "../test-suites/test-suites.module";
import { TestPlan, TestPlanSchema } from "./test-plan.schema";
import { TestPlansController } from "./test-plans.controller";
import { TestPlansService } from "./test-plans.service";

@Module({
  imports: [
    ProjectsModule,
    EnvironmentsModule,
    TestSuitesModule,
    MongooseModule.forFeature([{ name: TestPlan.name, schema: TestPlanSchema }]),
  ],
  controllers: [TestPlansController],
  providers: [TestPlansService],
})
export class TestPlansModule {}
