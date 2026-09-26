import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { GeneratedDocumentTests } from "@atp/shared-types";
import {
  AiPromptInput,
  AiTestInput,
  GenerateDocumentTestsInput,
  generatedAnalysisSchema,
  generatedDocumentTestsSchema,
  generatedScenariosSchema,
  generatedSuggestionsSchema,
  generatedTestSchema,
} from "@atp/validation";
import { Model, Types } from "mongoose";
import { ZodError } from "zod";
import { AppException } from "../../common/app.exception";
import { asObjectId } from "../../common/ids";
import { ApplicationsService } from "../applications/applications.service";
import { ProjectFilesService } from "../project-files/project-files.service";
import { ProjectsService } from "../projects/projects.service";
import { TestCasesService } from "../test-cases/test-cases.service";
import { TestResult, TestRun } from "../test-runs/execution.schemas";
import { AiRequest, AiRequestDocument } from "./ai-request.schema";
import { AiProvider } from "./ai.provider";
import { parseModelJson } from "./ai.parse";
import { DOCUMENT_TAG, engineForApplication, sectionDrafts } from "./document-drafts";

const DOCUMENT_CHAR_LIMIT = 15_000;
const JSON_SYSTEM = "Reply with JSON only. Do not invent results that were not asked for, and do not include markdown.";

@Injectable()
export class AiService {
  constructor(
    @InjectModel(AiRequest.name) private readonly requests: Model<AiRequest>,
    @InjectModel(TestRun.name) private readonly runs: Model<TestRun>,
    @InjectModel(TestResult.name) private readonly results: Model<TestResult>,
    private readonly provider: AiProvider,
    private readonly projects: ProjectsService,
    private readonly applications: ApplicationsService,
    private readonly testCases: TestCasesService,
    private readonly files: ProjectFilesService,
  ) {}

  async list(projectId: string) {
    await this.projects.ensure(projectId);
    const records = await this.requests.find({ projectId: asObjectId(projectId) }).sort({ createdAt: -1 }).limit(50);
    return records.map((record) => this.present(record));
  }

  async scenarios(projectId: string, input: AiPromptInput, userId: string) {
    await this.projects.ensure(projectId);
    const text = await this.provider.complete(JSON_SYSTEM, `Propose test scenarios as {"scenarios":[{"title":"","objective":""}]}. Request: ${input.prompt}`);
    const output = this.read(text, generatedScenariosSchema);
    return this.present(await this.store(projectId, "scenario", input.prompt, output, userId));
  }

  async tests(projectId: string, input: AiTestInput, userId: string) {
    await this.projects.ensure(projectId);
    await this.applications.ensureInProject(input.applicationId, projectId);
    const text = await this.provider.complete(
      JSON_SYSTEM,
      `Draft one automated test as {"title":"","objective":"","engineType":"web","steps":[{"action":"navigate","target":"","value":""}]}. Use only supported actions. Request: ${input.prompt}`,
    );
    const output = this.read(text, generatedTestSchema);
    const record = await this.store(projectId, "test", input.prompt, { ...output, applicationId: input.applicationId }, userId);
    return this.present(record);
  }

  async checkConnection() {
    const started = Date.now();
    const reply = await this.provider.complete("You are a connection check.", "Reply with the single word OK.");
    return { ok: true, reply: reply.trim().slice(0, 80), durationMs: Date.now() - started };
  }

  async generateFromDocument(fileId: string, input: GenerateDocumentTestsInput, userId: string): Promise<GeneratedDocumentTests> {
    const document = await this.files.readText(fileId);
    const projectId = document.file.projectId;
    const application = await this.documentApplication(projectId, input.applicationId);
    const engineType = engineForApplication(application.type);
    const fileName = document.file.fileName;

    const drafts = input.useAi
      ? (await this.aiDocumentDrafts(fileName, document.text)).map((draft) => ({
          title: draft.title,
          objective: draft.objective,
          description: `Drafted by AI from ${fileName}.`,
          type: draft.engineType === "api" ? ("api" as const) : ("functional" as const),
          engineType: draft.engineType,
          priority: "medium" as const,
          status: "draft" as const,
          tags: [DOCUMENT_TAG, "ai"],
          preconditions: [],
          steps: draft.steps.map((step, index) => ({ id: `ai-${index + 1}`, order: index, action: step.action, target: step.target, value: step.value })),
        }))
      : sectionDrafts(fileName, document.sections, engineType);
    if (drafts.length === 0) {
      throw new AppException("VALIDATION_ERROR", "This document has no sections with text to turn into test cases", HttpStatus.UNPROCESSABLE_ENTITY);
    }

    const existing = await this.testCases.list(projectId);
    const taken = new Set(existing.filter((testCase) => testCase.tags.includes(DOCUMENT_TAG)).map((testCase) => testCase.title.toLowerCase()));
    const created = [];
    const skipped = [];
    for (const draft of drafts) {
      if (taken.has(draft.title.toLowerCase())) {
        skipped.push(draft.title);
        continue;
      }
      created.push(await this.testCases.create(projectId, { ...draft, applicationId: application.id }, userId));
      taken.add(draft.title.toLowerCase());
    }

    if (input.useAi) {
      await this.requests.create({
        projectId: asObjectId(projectId),
        kind: "test",
        prompt: `From document ${fileName}`,
        output: { tests: drafts.map((draft) => draft.title), applicationId: application.id },
        status: "approved",
        createdTestCaseIds: created.map((testCase) => new Types.ObjectId(testCase.id)),
        createdBy: new Types.ObjectId(userId),
      });
    }
    return { source: input.useAi ? "ai" : "sections", created, skipped };
  }

  private async documentApplication(projectId: string, applicationId?: string) {
    if (applicationId) {
      await this.applications.ensureInProject(applicationId, projectId);
      return this.applications.get(applicationId);
    }
    const [first] = await this.applications.list(projectId);
    if (!first) {
      throw new AppException("VALIDATION_ERROR", "Add the website or API URL in project Settings first", HttpStatus.BAD_REQUEST);
    }
    return first;
  }

  private async aiDocumentDrafts(fileName: string, documentText: string) {
    const text = await this.provider.complete(
      JSON_SYSTEM,
      [
        "Read the requirement document below and draft up to 15 automated tests that check the behaviour it describes.",
        'Reply as {"tests":[{"title":"","objective":"","engineType":"web","steps":[{"action":"navigate","target":"","value":""}]}]}.',
        "engineType is web for browser tests or api for HTTP tests.",
        "Web actions: navigate (value = path like /login), click, fill (target = CSS selector, value = text), select, check, uncheck, assertText (target, value = expected text), assertVisible (target), wait, screenshot.",
        "API tests use action httpRequest with target = path.",
        "Paths are relative to the application base URL. Only use behaviour stated in the document; if selectors are unknown, use descriptive placeholders like [data-testid=task-title].",
        `Document "${fileName}":`,
        documentText.slice(0, DOCUMENT_CHAR_LIMIT),
      ].join("\n"),
    );
    return this.read(text, generatedDocumentTestsSchema).tests;
  }

  async suggestions(projectId: string, input: AiPromptInput, userId: string) {
    await this.projects.ensure(projectId);
    const failures = await this.recentFailures(projectId);
    const evidence = failures.length > 0 ? failures.map((failure) => failure.error?.message ?? failure.status).join("\n") : "No recent failures.";
    const text = await this.provider.complete(JSON_SYSTEM, `Return {"suggestions":["..."]} from this note and the failures.\nNote: ${input.prompt}\nFailures:\n${evidence}`);
    const output = this.read(text, generatedSuggestionsSchema);
    return this.present(await this.store(projectId, "suggestion", input.prompt, output, userId));
  }

  async analyze(resultId: string, userId: string) {
    const result = await this.results.findById(asObjectId(resultId, "Test result not found"));
    if (!result) throw new AppException("NOT_FOUND", "Test result not found", HttpStatus.NOT_FOUND);
    const run = await this.runs.findById(result.runId);
    if (!run) throw new AppException("NOT_FOUND", "Test run not found", HttpStatus.NOT_FOUND);
    await this.projects.ensure(run.projectId.toString());
    const steps = result.steps.map((step) => `${step.order}. ${step.action} ${step.status} ${step.error ?? ""}`).join("\n");
    const text = await this.provider.complete(
      JSON_SYSTEM,
      `Explain this failed result as {"analysis":"..."}.\nStatus: ${result.status}\nError: ${result.error?.message ?? "none"}\nSteps:\n${steps}`,
    );
    const output = this.read(text, generatedAnalysisSchema);
    return this.present(await this.store(run.projectId.toString(), "failure", resultId, output, userId));
  }

  async approve(id: string, userId: string) {
    const record = await this.requests.findById(asObjectId(id, "AI request not found"));
    if (!record) throw new AppException("NOT_FOUND", "AI request not found", HttpStatus.NOT_FOUND);
    if (record.kind !== "test" || record.status === "approved") {
      throw new AppException("CONFLICT", "Only a completed test draft can be approved", HttpStatus.CONFLICT);
    }
    const draft = this.read(JSON.stringify(record.output ?? {}), generatedTestSchema);
    const applicationId = outputApplicationId(record.output);
    const created = await this.testCases.create(
      record.projectId.toString(),
      {
        applicationId,
        title: draft.title,
        objective: draft.objective,
        type: "functional",
        engineType: draft.engineType,
        priority: "medium",
        status: "draft",
        tags: ["ai"],
        preconditions: [],
        steps: draft.steps.map((step, index) => ({ id: `ai-${index + 1}`, order: index, action: step.action, target: step.target, value: step.value })),
      },
      userId,
    );
    record.status = "approved";
    record.createdTestCaseIds = [new Types.ObjectId(created.id)];
    await record.save();
    return this.present(record);
  }

  private async recentFailures(projectId: string) {
    const runs = await this.runs.find({ projectId: asObjectId(projectId) }).sort({ createdAt: -1 }).limit(20).select("_id");
    return this.results.find({ runId: { $in: runs.map((run) => run._id) }, status: "failed" }).sort({ createdAt: -1 }).limit(8);
  }

  private read<T>(text: string, schema: { parse(value: unknown): T }) {
    try {
      return schema.parse(parseModelJson(text));
    } catch (error) {
      const message = error instanceof ZodError || error instanceof SyntaxError ? "The model response was not usable" : "The model response was not usable";
      throw new AppException("ENGINE_ERROR", message, HttpStatus.BAD_GATEWAY);
    }
  }

  private store(projectId: string, kind: AiRequest["kind"], prompt: string, output: unknown, userId: string) {
    return this.requests.create({
      projectId: asObjectId(projectId),
      kind,
      prompt,
      output,
      status: "completed",
      createdBy: new Types.ObjectId(userId),
    });
  }

  private present(record: AiRequestDocument) {
    return {
      id: record.id,
      projectId: record.projectId.toString(),
      kind: record.kind,
      prompt: record.prompt,
      output: record.output ?? null,
      status: record.status,
      createdTestCaseIds: record.createdTestCaseIds.map((id) => id.toString()),
      createdAt: record.createdAt.toISOString(),
    };
  }
}

function outputApplicationId(output: unknown) {
  if (!output || typeof output !== "object" || !("applicationId" in output) || typeof output.applicationId !== "string") {
    throw new AppException("VALIDATION_ERROR", "The draft is missing an application", HttpStatus.BAD_REQUEST);
  }
  return output.applicationId;
}
