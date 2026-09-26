import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { TestPlan as TestPlanView } from "@atp/shared-types";
import { CreateTestPlanInput, UpdateTestPlanInput } from "@atp/validation";
import { Model } from "mongoose";
import { AppException } from "../../common/app.exception";
import { asObjectId } from "../../common/ids";
import { HttpStatus } from "@nestjs/common";
import { EnvironmentsService } from "../environments/environments.service";
import { ProjectsService } from "../projects/projects.service";
import { TestSuitesService } from "../test-suites/test-suites.service";
import { TestPlan, TestPlanDocument } from "./test-plan.schema";

@Injectable()
export class TestPlansService {
  constructor(
    @InjectModel(TestPlan.name) private readonly plans: Model<TestPlan>,
    private readonly projects: ProjectsService,
    private readonly suites: TestSuitesService,
    private readonly environments: EnvironmentsService,
  ) {}

  async list(projectId: string): Promise<TestPlanView[]> {
    await this.projects.ensure(projectId);
    const records = await this.plans.find({ projectId: asObjectId(projectId) }).sort({ name: 1 });
    return records.map((record) => this.present(record));
  }

  async get(id: string): Promise<TestPlanView> {
    return this.present(await this.find(id));
  }

  async create(projectId: string, input: CreateTestPlanInput): Promise<TestPlanView> {
    await this.assertRelations(projectId, input.environmentId, input.suiteIds);
    const record = await this.plans.create({
      projectId: asObjectId(projectId),
      name: input.name,
      suiteIds: input.suiteIds.map((id) => asObjectId(id)),
      environmentId: asObjectId(input.environmentId),
      browserConfig: input.browserConfig,
      variables: input.variables,
    });
    return this.present(record);
  }

  async update(id: string, input: UpdateTestPlanInput): Promise<TestPlanView> {
    const record = await this.find(id);
    const projectId = record.projectId.toString();
    if (input.environmentId || input.suiteIds) {
      await this.assertRelations(
        projectId,
        input.environmentId ?? record.environmentId.toString(),
        input.suiteIds ?? record.suiteIds.map((suiteId) => suiteId.toString()),
      );
    }
    if (input.name !== undefined) record.name = input.name;
    if (input.environmentId !== undefined) record.environmentId = asObjectId(input.environmentId);
    if (input.suiteIds !== undefined) record.suiteIds = input.suiteIds.map((suiteId) => asObjectId(suiteId));
    if (input.browserConfig !== undefined) record.browserConfig = input.browserConfig;
    if (input.variables !== undefined) record.variables = input.variables;
    await record.save();
    return this.present(record);
  }

  async remove(id: string) {
    const record = await this.find(id);
    await record.deleteOne();
    return { deleted: true };
  }

  private async assertRelations(projectId: string, environmentId: string, suiteIds: string[]) {
    await this.projects.ensure(projectId);
    await this.environments.ensureInProject(environmentId, projectId);
    await this.suites.ensureIds(projectId, suiteIds);
  }

  private async find(id: string) {
    const record = await this.plans.findById(asObjectId(id, "Test plan not found"));
    if (!record) {
      throw new AppException("NOT_FOUND", "Test plan not found", HttpStatus.NOT_FOUND);
    }
    return record;
  }

  private present(record: TestPlanDocument): TestPlanView {
    return {
      id: record.id,
      projectId: record.projectId.toString(),
      name: record.name,
      suiteIds: record.suiteIds.map((id) => id.toString()),
      environmentId: record.environmentId.toString(),
      browserConfig: record.browserConfig,
      variables: record.variables,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }
}
