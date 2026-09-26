import { randomUUID } from "node:crypto";
import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { TestCase as TestCaseView, TestCaseValidation } from "@atp/shared-types";
import { CreateTestCaseInput, UpdateTestCaseInput } from "@atp/validation";
import { Model, Types } from "mongoose";
import { AppException } from "../../common/app.exception";
import { asObjectId, isDuplicateKey } from "../../common/ids";
import { toResourceKey } from "../../common/slug";
import { ApplicationsService } from "../applications/applications.service";
import { EnvironmentsService } from "../environments/environments.service";
import { ProjectsService } from "../projects/projects.service";
import { TestCase, TestCaseDocument } from "./test-case.schema";

@Injectable()
export class TestCasesService {
  constructor(
    @InjectModel(TestCase.name) private readonly testCases: Model<TestCase>,
    private readonly projects: ProjectsService,
    private readonly applications: ApplicationsService,
    private readonly environments: EnvironmentsService,
  ) {}

  async list(projectId: string): Promise<TestCaseView[]> {
    await this.projects.ensure(projectId);
    const records = await this.testCases.find({ projectId: asObjectId(projectId) }).sort({ updatedAt: -1 });
    return records.map((record) => this.present(record));
  }

  async get(id: string): Promise<TestCaseView> {
    return this.present(await this.find(id));
  }

  async create(projectId: string, input: CreateTestCaseInput, userId: string): Promise<TestCaseView> {
    await this.assertRelations(projectId, input.applicationId, input.environmentId);
    const key = input.key ? toResourceKey(input.key) : await this.availableKey(projectId, toResourceKey(input.title, "CASE"));
    try {
      const record = await this.testCases.create({
        projectId: asObjectId(projectId),
        applicationId: asObjectId(input.applicationId),
        environmentId: input.environmentId ? asObjectId(input.environmentId) : undefined,
        key,
        title: input.title,
        description: input.description,
        objective: input.objective,
        type: input.type,
        engineType: input.engineType,
        priority: input.priority,
        status: input.status,
        tags: input.tags,
        preconditions: input.preconditions,
        steps: this.normalizeSteps(input.steps),
        testData: input.testData,
        createdBy: new Types.ObjectId(userId),
      });
      return this.present(record);
    } catch (error) {
      if (isDuplicateKey(error)) {
        throw new AppException("CONFLICT", "A test case with that key already exists in this project", HttpStatus.CONFLICT);
      }
      throw error;
    }
  }

  async update(id: string, input: UpdateTestCaseInput): Promise<TestCaseView> {
    const record = await this.find(id);
    if (input.applicationId || input.environmentId) {
      await this.assertRelations(
        record.projectId.toString(),
        input.applicationId ?? record.applicationId.toString(),
        input.environmentId ?? record.environmentId?.toString(),
      );
    }
    if (input.applicationId) record.applicationId = asObjectId(input.applicationId);
    if (input.environmentId) record.environmentId = asObjectId(input.environmentId);
    if (input.title !== undefined) record.title = input.title;
    if (input.description !== undefined) record.description = input.description;
    if (input.objective !== undefined) record.objective = input.objective;
    if (input.type !== undefined) record.type = input.type;
    if (input.engineType !== undefined) record.engineType = input.engineType;
    if (input.priority !== undefined) record.priority = input.priority;
    if (input.status !== undefined) record.status = input.status;
    if (input.tags !== undefined) record.tags = input.tags;
    if (input.preconditions !== undefined) record.preconditions = input.preconditions;
    if (input.testData !== undefined) record.testData = input.testData;
    if (input.steps) {
      record.steps = this.normalizeSteps(input.steps);
      record.markModified("steps");
    }
    if (input.key) {
      record.key = toResourceKey(input.key);
    }
    try {
      await record.save();
      return this.present(record);
    } catch (error) {
      if (isDuplicateKey(error)) {
        throw new AppException("CONFLICT", "A test case with that key already exists in this project", HttpStatus.CONFLICT);
      }
      throw error;
    }
  }

  async remove(id: string) {
    const record = await this.find(id);
    await record.deleteOne();
    return { deleted: true };
  }

  async validate(id: string): Promise<TestCaseValidation> {
    const record = await this.find(id);
    return this.issues(record);
  }

  async ensureIds(projectId: string, ids: string[]) {
    if (ids.length === 0) {
      return;
    }
    const count = await this.testCases.countDocuments({
      projectId: asObjectId(projectId),
      _id: { $in: ids.map((id) => asObjectId(id, "Test case not found")) },
    });
    if (count !== ids.length) {
      throw new AppException("VALIDATION_ERROR", "One or more test cases do not belong to this project", HttpStatus.BAD_REQUEST);
    }
  }

  private async assertRelations(projectId: string, applicationId: string, environmentId?: string) {
    await this.projects.ensure(projectId);
    await this.applications.ensureInProject(applicationId, projectId);
    if (environmentId) {
      await this.environments.ensureInProject(environmentId, projectId);
    }
  }

  private normalizeSteps(steps: CreateTestCaseInput["steps"]) {
    return steps.map((step, index) => ({
      id: step.id ?? randomUUID(),
      order: index,
      action: step.action,
      target: step.target,
      value: step.value,
      assertion: step.assertion,
      timeoutMs: step.timeoutMs,
    }));
  }

  private issues(record: TestCaseDocument): TestCaseValidation {
    const issues: string[] = [];
    if (!record.title.trim()) issues.push("Title is required");
    if (!record.applicationId) issues.push("Application is required");
    if (!record.engineType) issues.push("Engine is required");
    if (record.steps.length === 0) issues.push("Add at least one step before the case is ready");
    record.steps.forEach((step, index) => {
      if (!step.action) issues.push(`Step ${index + 1} needs an action`);
    });
    return { valid: issues.length === 0, issues };
  }

  private async find(id: string) {
    const record = await this.testCases.findById(asObjectId(id, "Test case not found"));
    if (!record) {
      throw new AppException("NOT_FOUND", "Test case not found", HttpStatus.NOT_FOUND);
    }
    return record;
  }

  private async availableKey(projectId: string, base: string) {
    let key = base;
    let suffix = 2;
    while (await this.testCases.exists({ projectId: asObjectId(projectId), key })) {
      key = `${base.slice(0, 34)}-${suffix}`;
      suffix += 1;
    }
    return key;
  }

  private present(record: TestCaseDocument): TestCaseView {
    return {
      id: record.id,
      projectId: record.projectId.toString(),
      applicationId: record.applicationId.toString(),
      environmentId: record.environmentId?.toString(),
      key: record.key,
      title: record.title,
      description: record.description,
      objective: record.objective,
      type: record.type as TestCaseView["type"],
      engineType: record.engineType as TestCaseView["engineType"],
      priority: record.priority,
      status: record.status,
      tags: record.tags,
      preconditions: record.preconditions,
      steps: record.steps.map((step) => ({
        id: step.id,
        order: step.order,
        action: step.action,
        target: step.target,
        value: step.value,
        assertion: step.assertion,
        timeoutMs: step.timeoutMs,
      })),
      testData: record.testData,
      createdBy: record.createdBy.toString(),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }
}
