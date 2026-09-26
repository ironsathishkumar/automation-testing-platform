import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { AuditLog } from "./audit-log.schema";

@Injectable()
export class AuditService {
  constructor(@InjectModel(AuditLog.name) private readonly auditLogs: Model<AuditLog>) {}

  record(entry: {
    userId?: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.auditLogs.create({
      userId: entry.userId ? new Types.ObjectId(entry.userId) : undefined,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId ? new Types.ObjectId(entry.resourceId) : undefined,
      metadata: entry.metadata,
    });
  }
}
