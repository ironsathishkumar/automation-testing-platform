import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

@Schema({ timestamps: true })
export class TestPlan {
  @Prop({ required: true, type: Types.ObjectId, index: true })
  projectId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ type: [Types.ObjectId], default: [] })
  suiteIds!: Types.ObjectId[];

  @Prop({ required: true, type: Types.ObjectId })
  environmentId!: Types.ObjectId;

  @Prop({ type: Object })
  browserConfig?: Record<string, unknown>;

  @Prop({ type: Object })
  variables?: Record<string, unknown>;

  createdAt!: Date;
  updatedAt!: Date;
}

export type TestPlanDocument = HydratedDocument<TestPlan>;
export const TestPlanSchema = SchemaFactory.createForClass(TestPlan);
