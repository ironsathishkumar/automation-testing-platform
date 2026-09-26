import { ArtifactType, ResultStatus, TestStep } from "@atp/shared-types";

export interface ExecutionContext {
  runId: string;
  jobId: string;
  testId: string;
  projectId: string;
  environmentId?: string;
  variables: Record<string, string>;
  artifactDirectory: string;
  timeoutMs: number;
  baseUrl?: string;
  apiBaseUrl?: string;
  browser?: string;
  steps: TestStep[];
  signal: AbortSignal;
}

export interface StepResult {
  id: string;
  order: number;
  action: string;
  status: ResultStatus;
  durationMs: number;
  message?: string;
  error?: string;
}

export interface ArtifactReference {
  type: ArtifactType;
  fileName: string;
  relativePath: string;
  mimeType: string;
  sizeBytes: number;
}

export interface EngineResult {
  status: "passed" | "failed" | "skipped" | "cancelled";
  durationMs: number;
  steps: StepResult[];
  errors: { code: string; message: string }[];
  artifacts: ArtifactReference[];
  metrics?: Record<string, number>;
  logs: string[];
}

export interface EngineCapabilities {
  actions: string[];
  browsers?: string[];
}

export interface TestEngine {
  readonly type: string;
  validate(config: unknown): Promise<{ valid: boolean; issues: string[] }>;
  execute(context: ExecutionContext): Promise<EngineResult>;
  cancel(executionId: string): Promise<void>;
  getCapabilities(): EngineCapabilities;
}
