import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

@Schema({ _id: false })
export class TestStep {
  @Prop({ required: true })
  id!: string;

  @Prop({ required: true })
  order!: number;

  @Prop({ required: true })
  action!: string;

  @Prop()
  target?: string;

  @Prop({ type: Object })
  value?: unknown;

  @Prop({ type: Object })
  assertion?: Record<string, unknown>;

  @Prop()
  timeoutMs?: number;
}

const TestStepSchema = SchemaFactory.createForClass(TestStep);

@Schema({ timestamps: true })
export class TestCase {
  @Prop({ required: true, type: Types.ObjectId, index: true })
  projectId!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId })
  applicationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  environmentId?: Types.ObjectId;

  @Prop({ required: true, trim: true })
  key!: string;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop()
  description?: string;

  @Prop()
  objective?: string;

  @Prop({ required: true })
  type!: string;

  @Prop({ required: true })
  engineType!: string;

  @Prop({ required: true, enum: ["low", "medium", "high", "critical"], default: "medium" })
  priority!: "low" | "medium" | "high" | "critical";

  @Prop({ required: true, enum: ["draft", "ready", "deprecated"], default: "draft" })
  status!: "draft" | "ready" | "deprecated";

  @Prop({ type: [String], default: [] })
  tags!: string[];

  @Prop({ type: [String], default: [] })
  preconditions!: string[];

  @Prop({ type: [TestStepSchema], default: [] })
  steps!: TestStep[];

  @Prop({ type: Object })
  testData?: Record<string, unknown>;

  @Prop({ required: true, type: Types.ObjectId })
  createdBy!: Types.ObjectId;

  createdAt!: Date;
  updatedAt!: Date;
}

export type TestCaseDocument = HydratedDocument<TestCase>;
export const TestCaseSchema = SchemaFactory.createForClass(TestCase);
TestCaseSchema.index({ projectId: 1, key: 1 }, { unique: true });
TestCaseSchema.index({ projectId: 1, tags: 1 });
