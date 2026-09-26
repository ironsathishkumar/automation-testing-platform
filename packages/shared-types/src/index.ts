export const SECRET_MASK = "********";

export const PROJECT_STATUSES = ["active", "archived"] as const;
export const APPLICATION_TYPES = ["web", "api", "mobile", "desktop", "service"] as const;
export const ENVIRONMENT_TYPES = ["local", "dev", "qa", "staging", "custom"] as const;
export const PRIORITIES = ["low", "medium", "high", "critical"] as const;
export const TEST_CASE_STATUSES = ["draft", "ready", "deprecated"] as const;
export const TEST_CASE_TYPES = ["functional", "regression", "smoke", "e2e", "api", "exploratory"] as const;
export const ENGINE_TYPES = [
  "web",
  "api",
  "mobile",
  "performance",
  "accessibility",
  "visual",
  "security",
  "database",
  "contract",
  "architecture",
  "reliability",
  "file",
  "notification",
  "localization",
] as const;
export const EXECUTION_MODES = ["sequential", "parallel"] as const;
export const USER_STATUSES = ["active", "inactive"] as const;
export const STEP_ACTIONS = [
  "navigate",
  "click",
  "fill",
  "select",
  "check",
  "uncheck",
  "upload",
  "assertText",
  "assertVisible",
  "httpRequest",
  "wait",
  "download",
  "screenshot",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export type ApplicationType = (typeof APPLICATION_TYPES)[number];
export type EnvironmentType = (typeof ENVIRONMENT_TYPES)[number];
export type Priority = (typeof PRIORITIES)[number];
export type TestCaseStatus = (typeof TEST_CASE_STATUSES)[number];
export type TestCaseType = (typeof TEST_CASE_TYPES)[number];
export type EngineType = (typeof ENGINE_TYPES)[number];
export type ExecutionMode = (typeof EXECUTION_MODES)[number];
export type UserStatus = (typeof USER_STATUSES)[number];
export type StepAction = (typeof STEP_ACTIONS)[number];

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message: string;
}

export interface ApiFailure {
  success: false;
  error: {
    code: string;
    message: string;
    details: unknown[];
  };
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  key: string;
  description: string;
  status: ProjectStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectCounts {
  applications: number;
  environments: number;
  testCases: number;
  suites: number;
  plans: number;
}

export interface ProjectDetail extends Project {
  counts: ProjectCounts;
}

export interface RepositoryMetadata {
  url?: string;
  branch?: string;
  provider?: string;
}

export interface Application {
  id: string;
  projectId: string;
  name: string;
  type: ApplicationType;
  description: string;
  baseUrl?: string;
  apiBaseUrl?: string;
  repository?: RepositoryMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface EnvironmentVariable {
  key: string;
  value: string;
  isSecret: boolean;
}

export interface EnvironmentSettings {
  browser?: string;
  timeoutMs?: number;
  [key: string]: unknown;
}

export interface Environment {
  id: string;
  projectId: string;
  name: string;
  type: EnvironmentType;
  baseUrl?: string;
  apiBaseUrl?: string;
  variables: EnvironmentVariable[];
  settings: EnvironmentSettings;
  createdAt: string;
  updatedAt: string;
}

export interface TestStep {
  id: string;
  order: number;
  action: string;
  target?: string;
  value?: unknown;
  assertion?: Record<string, unknown>;
  timeoutMs?: number;
}

export interface TestCase {
  id: string;
  projectId: string;
  applicationId: string;
  environmentId?: string;
  key: string;
  title: string;
  description?: string;
  objective?: string;
  type: TestCaseType;
  engineType: EngineType;
  priority: Priority;
  status: TestCaseStatus;
  tags: string[];
  preconditions: string[];
  steps: TestStep[];
  testData?: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestCaseValidation {
  valid: boolean;
  issues: string[];
}

export interface TestSuite {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  testCaseIds: string[];
  executionMode: ExecutionMode;
  retryCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TestPlan {
  id: string;
  projectId: string;
  name: string;
  suiteIds: string[];
  environmentId: string;
  browserConfig?: Record<string, unknown>;
  variables?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardSummary {
  projectCount: number;
  activeProjectCount: number;
  applicationCount: number;
  environmentCount: number;
  testCaseCount: number;
  suiteCount: number;
  planCount: number;
  recentProjects: Project[];
}

export interface HealthStatus {
  status: "ok";
  mongo: "up" | "down";
}

export const RUN_STATUSES = ["queued", "running", "passed", "failed", "cancelled", "crashed"] as const;
export const RESULT_STATUSES = ["passed", "failed", "skipped", "cancelled"] as const;
export const JOB_STATUSES = ["queued", "running", "completed", "failed", "cancelled"] as const;
export const ARTIFACT_TYPES = ["screenshot", "video", "trace", "log", "report", "network", "other"] as const;

export type RunStatus = (typeof RUN_STATUSES)[number];
export type ResultStatus = (typeof RESULT_STATUSES)[number];
export type JobStatus = (typeof JOB_STATUSES)[number];
export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

export interface TestRun {
  id: string;
  projectId: string;
  planId?: string;
  suiteId?: string;
  status: RunStatus;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  cancelled: number;
  triggeredBy: string;
  createdAt: string;
}

export interface ResultStep {
  id: string;
  order: number;
  action: string;
  status: ResultStatus;
  durationMs: number;
  message?: string;
  error?: string;
}

export interface TestResult {
  id: string;
  runId: string;
  testCaseId: string;
  status: ResultStatus;
  durationMs: number;
  steps: ResultStep[];
  error?: { code: string; message: string };
  artifactIds: string[];
  metrics?: Record<string, number>;
  variant?: string;
  createdAt: string;
}

export interface Artifact {
  id: string;
  projectId: string;
  runId: string;
  resultId?: string;
  type: ArtifactType;
  fileName: string;
  relativePath: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface ExecutionLogEntry {
  id: string;
  runId: string;
  jobId?: string;
  testCaseId?: string;
  level: "error" | "warn" | "info" | "debug";
  message: string;
  createdAt: string;
}
