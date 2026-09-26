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
  viewport?: { width: number; height: number };
  headed?: boolean;
  session?: SharedSession;
  steps: TestStep[];
  signal: AbortSignal;
}

/** Consecutive jobs that share one browser, so a run plays out like one person using the app. */
export interface SharedSession {
  key: string;
  index: number;
  total: number;
  directory: string;
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
  /** Evidence that belongs to the whole run, such as the recording of a shared browser session. */
  runArtifacts?: ArtifactReference[];
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
