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
