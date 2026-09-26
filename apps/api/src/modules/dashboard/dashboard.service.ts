import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { DashboardSummary } from "@atp/shared-types";
import { Model } from "mongoose";
import { Application } from "../applications/application.schema";
import { Environment } from "../environments/environment.schema";
import { Project, ProjectDocument } from "../projects/project.schema";
import { TestCase } from "../test-cases/test-case.schema";
import { TestPlan } from "../test-plans/test-plan.schema";
import { TestSuite } from "../test-suites/test-suite.schema";

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Project.name) private readonly projects: Model<Project>,
    @InjectModel(Application.name) private readonly applications: Model<Application>,
    @InjectModel(Environment.name) private readonly environments: Model<Environment>,
    @InjectModel(TestCase.name) private readonly testCases: Model<TestCase>,
    @InjectModel(TestSuite.name) private readonly suites: Model<TestSuite>,
    @InjectModel(TestPlan.name) private readonly plans: Model<TestPlan>,
  ) {}

  async summary(): Promise<DashboardSummary> {
    const [projectCount, activeProjectCount, applicationCount, environmentCount, testCaseCount, suiteCount, planCount, recent] =
      await Promise.all([
        this.projects.countDocuments(),
        this.projects.countDocuments({ status: "active" }),
        this.applications.countDocuments(),
        this.environments.countDocuments(),
        this.testCases.countDocuments(),
        this.suites.countDocuments(),
        this.plans.countDocuments(),
        this.projects.find().sort({ updatedAt: -1 }).limit(5),
      ]);

    return {
      projectCount,
      activeProjectCount,
      applicationCount,
      environmentCount,
      testCaseCount,
      suiteCount,
      planCount,
      recentProjects: recent.map((project) => this.present(project)),
    };
  }

  private present(project: ProjectDocument) {
    return {
      id: project.id,
      name: project.name,
      key: project.key,
      description: project.description,
      status: project.status,
      createdBy: project.createdBy.toString(),
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };
  }
}
