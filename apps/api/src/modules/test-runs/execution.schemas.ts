import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class TestRun {
  @Prop({ required: true, type: Types.ObjectId, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  planId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  suiteId?: Types.ObjectId;

  @Prop({ required: true, enum: ["queued", "running", "passed", "failed", "cancelled", "crashed"], default: "queued" })
  status!: "queued" | "running" | "passed" | "failed" | "cancelled" | "crashed";

  @Prop({ required: true, enum: ["sequential", "parallel"], default: "sequential" })
  executionMode!: "sequential" | "parallel";

  @Prop({ default: 0 })
  retryCount!: number;

  @Prop({ default: false })
  cancelRequested!: boolean;

  @Prop()
  startedAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop()
  durationMs?: number;

  @Prop({ default: 0 })
  total!: number;

  @Prop({ default: 0 })
  passed!: number;

  @Prop({ default: 0 })
  failed!: number;

  @Prop({ default: 0 })
  skipped!: number;

  @Prop({ default: 0 })
  cancelled!: number;

  @Prop({ required: true, type: Types.ObjectId })
  triggeredBy!: Types.ObjectId;

  createdAt!: Date;
}

export type TestRunDocument = HydratedDocument<TestRun>;
export const TestRunSchema = SchemaFactory.createForClass(TestRun);
TestRunSchema.index({ projectId: 1, createdAt: -1 });

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class ExecutionJob {
  @Prop({ required: true, type: Types.ObjectId, index: true })
  runId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  testCaseId?: Types.ObjectId;

  @Prop({ required: true })
  engineType!: string;

  @Prop({ required: true, enum: ["queued", "running", "completed", "failed", "cancelled"], default: "queued" })
  status!: "queued" | "running" | "completed" | "failed" | "cancelled";

  @Prop({ required: true, default: 1 })
  attempt!: number;

  @Prop({ type: Object, default: {} })
  payload!: Record<string, unknown>;

  @Prop()
  startedAt?: Date;

  @Prop()
  completedAt?: Date;

  createdAt!: Date;
}

export type ExecutionJobDocument = HydratedDocument<ExecutionJob>;
export const ExecutionJobSchema = SchemaFactory.createForClass(ExecutionJob);
ExecutionJobSchema.index({ status: 1, createdAt: 1 });

@Schema({ _id: false })
export class ResultStep {
  @Prop({ required: true })
  id!: string;

  @Prop({ required: true })
  order!: number;

  @Prop({ required: true })
  action!: string;

  @Prop({ required: true })
  status!: string;

  @Prop({ required: true })
  durationMs!: number;

  @Prop()
  message?: string;

  @Prop()
  error?: string;
}

const ResultStepSchema = SchemaFactory.createForClass(ResultStep);

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class TestResult {
  @Prop({ required: true, type: Types.ObjectId, index: true })
  runId!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId })
  testCaseId!: Types.ObjectId;

  @Prop({ required: true, enum: ["passed", "failed", "skipped", "cancelled"] })
  status!: "passed" | "failed" | "skipped" | "cancelled";

  @Prop({ required: true })
  durationMs!: number;

  @Prop({ type: [ResultStepSchema], default: [] })
  steps!: ResultStep[];

  @Prop({ type: Object })
  error?: { code: string; message: string };

  @Prop({ type: [Types.ObjectId], default: [] })
  artifactIds!: Types.ObjectId[];

  @Prop({ type: Object })
  metrics?: Record<string, number>;

  @Prop({ required: true, default: 1 })
  attempt!: number;

  @Prop()
  variant?: string;

  createdAt!: Date;
}

export type TestResultDocument = HydratedDocument<TestResult>;
export const TestResultSchema = SchemaFactory.createForClass(TestResult);

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class ArtifactRecord {
  @Prop({ required: true, type: Types.ObjectId })
  projectId!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, index: true })
  runId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  resultId?: Types.ObjectId;

  @Prop({ required: true, enum: ["screenshot", "video", "trace", "log", "report", "network", "other"] })
  type!: "screenshot" | "video" | "trace" | "log" | "report" | "network" | "other";

  @Prop({ required: true })
  fileName!: string;

  @Prop({ required: true })
  relativePath!: string;

  @Prop({ required: true })
  mimeType!: string;

  @Prop({ required: true })
  sizeBytes!: number;

  createdAt!: Date;
}

export type ArtifactDocument = HydratedDocument<ArtifactRecord>;
export const ArtifactSchema = SchemaFactory.createForClass(ArtifactRecord);

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class ExecutionLog {
  @Prop({ required: true, type: Types.ObjectId, index: true })
  runId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  jobId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  testCaseId?: Types.ObjectId;

  @Prop({ required: true, enum: ["error", "warn", "info", "debug"], default: "info" })
  level!: "error" | "warn" | "info" | "debug";

  @Prop({ required: true })
  message!: string;

  createdAt!: Date;
}

export type ExecutionLogDocument = HydratedDocument<ExecutionLog>;
export const ExecutionLogSchema = SchemaFactory.createForClass(ExecutionLog);
