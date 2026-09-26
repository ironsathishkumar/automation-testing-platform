import {
  APPLICATION_TYPES,
  ENGINE_TYPES,
  ENVIRONMENT_TYPES,
  EXECUTION_MODES,
  PRIORITIES,
  PROJECT_STATUSES,
  STEP_ACTIONS,
  TEST_CASE_STATUSES,
  TEST_CASE_TYPES,
} from "@atp/shared-types";
import { z } from "zod";

function enumOf<T extends string>(values: readonly T[]) {
  return z.enum(values as unknown as [T, ...T[]]);
}

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, "Expected an id");

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));

const optionalUrl = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .transform((value) => (value ? value : undefined))
  .refine((value) => value === undefined || z.string().url().safeParse(value).success, {
    message: "Enter a valid URL",
  });

const tags = z.array(z.string().trim().min(1).max(40)).max(30).default([]);

export const registerSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(200),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(128),
});

export const createProjectSchema = z.object({
  name: z.string().trim().min(2).max(120),
  key: z
    .string()
    .trim()
    .max(32)
    .optional()
    .transform((value) => (value ? value : undefined)),
  description: z.string().trim().max(2000).optional().default(""),
});

export const updateProjectSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  key: z.string().trim().min(2).max(32).optional(),
  description: z.string().trim().max(2000).optional(),
  status: enumOf(PROJECT_STATUSES).optional(),
});

const repositorySchema = z.object({
  url: optionalUrl,
  branch: optionalText(120),
  provider: optionalText(40),
});

export const createApplicationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  type: enumOf(APPLICATION_TYPES),
  description: z.string().trim().max(2000).optional().default(""),
  baseUrl: optionalUrl,
  apiBaseUrl: optionalUrl,
  repository: repositorySchema.optional(),
});

export const updateApplicationSchema = createApplicationSchema.partial();

export const environmentVariableSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[A-Za-z_][A-Za-z0-9_]*$/, "Use letters, numbers, and underscores"),
  value: z.string().max(4000),
  isSecret: z.boolean().default(false),
});

export const createEnvironmentSchema = z.object({
  name: z.string().trim().min(2).max(120),
  type: enumOf(ENVIRONMENT_TYPES),
  baseUrl: optionalUrl,
  apiBaseUrl: optionalUrl,
  variables: z.array(environmentVariableSchema).max(50).default([]),
  settings: z
    .object({
      browser: z.string().trim().max(40).optional(),
      timeoutMs: z.number().int().min(0).max(600000).optional(),
    })
    .optional()
    .default({}),
});

export const updateEnvironmentSchema = createEnvironmentSchema.partial();

export const testStepSchema = z.object({
  id: z.string().trim().min(1).max(80).optional(),
  order: z.number().int().min(0),
  action: enumOf(STEP_ACTIONS),
  target: optionalText(500),
  value: z.unknown().optional(),
  assertion: z.record(z.string(), z.unknown()).optional(),
  timeoutMs: z.number().int().min(0).max(300000).optional(),
});

export const createTestCaseSchema = z.object({
  applicationId: objectId,
  environmentId: objectId.optional(),
  key: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((value) => (value ? value : undefined)),
  title: z.string().trim().min(2).max(200),
  description: optionalText(4000),
  objective: optionalText(2000),
  type: enumOf(TEST_CASE_TYPES),
  engineType: enumOf(ENGINE_TYPES),
  priority: enumOf(PRIORITIES).default("medium"),
  status: enumOf(TEST_CASE_STATUSES).default("draft"),
  tags,
  preconditions: z.array(z.string().trim().min(1).max(500)).max(30).default([]),
  steps: z.array(testStepSchema).max(100).default([]),
  testData: z.record(z.string(), z.unknown()).optional(),
});

export const updateTestCaseSchema = createTestCaseSchema.partial();

export const createTestSuiteSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: optionalText(2000),
  testCaseIds: z.array(objectId).max(200).default([]),
  executionMode: enumOf(EXECUTION_MODES).default("sequential"),
  retryCount: z.number().int().min(0).max(5).default(0),
  tags,
});

export const updateTestSuiteSchema = createTestSuiteSchema.partial();

export const createTestPlanSchema = z.object({
  name: z.string().trim().min(2).max(160),
  suiteIds: z.array(objectId).min(1).max(100),
  environmentId: objectId,
  browserConfig: z.record(z.string(), z.unknown()).optional(),
  variables: z.record(z.string(), z.unknown()).optional(),
});

export const updateTestPlanSchema = createTestPlanSchema.partial();

export const createRunSchema = z
  .object({
    projectId: objectId,
    planId: objectId.optional(),
    suiteId: objectId.optional(),
    testCaseId: objectId.optional(),
    environmentId: objectId.optional(),
  })
  .refine((value) => Boolean(value.planId || value.suiteId || value.testCaseId), {
    message: "Choose a plan, suite, or test case",
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;
export type CreateEnvironmentInput = z.infer<typeof createEnvironmentSchema>;
export type UpdateEnvironmentInput = z.infer<typeof updateEnvironmentSchema>;
export type CreateTestCaseInput = z.infer<typeof createTestCaseSchema>;
export type UpdateTestCaseInput = z.infer<typeof updateTestCaseSchema>;
export type CreateTestSuiteInput = z.infer<typeof createTestSuiteSchema>;
export type UpdateTestSuiteInput = z.infer<typeof updateTestSuiteSchema>;
export type CreateTestPlanInput = z.infer<typeof createTestPlanSchema>;
export type UpdateTestPlanInput = z.infer<typeof updateTestPlanSchema>;
export type CreateRunInput = z.infer<typeof createRunSchema>;
