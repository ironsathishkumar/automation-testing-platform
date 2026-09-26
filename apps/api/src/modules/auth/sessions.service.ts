import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { AppException } from "../../common/app.exception";
import { AuditService } from "../audit/audit.service";
import { AuthSession, AuthSessionDocument } from "./auth-session.schema";
import { formatRefreshToken, hashRefreshSecret, newRefreshSecret, parseRefreshToken, sameHash } from "./refresh-token";

const ROTATION_GRACE_MS = 30_000;

export interface ClientInfo {
  userAgent?: string;
  ip?: string;
}

export interface IssuedRefresh {
  sessionId: string;
  refreshToken: string;
  expiresAt: Date;
}

export type RotationResult =
  | ({ kind: "rotated"; userId: string } & IssuedRefresh)
  | { kind: "concurrent" };

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    @InjectModel(AuthSession.name) private readonly sessions: Model<AuthSession>,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async create(userId: string, client: ClientInfo): Promise<IssuedRefresh> {
    const secret = newRefreshSecret();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.getOrThrow<number>("REFRESH_TOKEN_TTL_DAYS") * 86_400_000);
    const session = await this.sessions.create({
      userId: new Types.ObjectId(userId),
      tokenHash: hashRefreshSecret(secret),
      expiresAt,
      lastUsedAt: now,
      ...this.clientFields(client),
    });
    return { sessionId: session.id, refreshToken: formatRefreshToken(session.id, secret), expiresAt };
  }

  async rotate(rawToken: unknown, client: ClientInfo): Promise<RotationResult> {
    const parsed = parseRefreshToken(rawToken);
    if (!parsed) throw invalidSession();
    const now = new Date();
    const session = await this.sessions.findById(parsed.sessionId);
    if (!session || session.revokedAt || session.expiresAt <= now) throw invalidSession();

    const presented = hashRefreshSecret(parsed.secret);
    if (!sameHash(presented, session.tokenHash)) {
      if (sameHash(presented, session.previousTokenHash) && session.rotatedAt && now.getTime() - session.rotatedAt.getTime() < ROTATION_GRACE_MS) {
        return { kind: "concurrent" };
      }
      await this.revokeDocument(session, "refresh_token_reuse");
      this.logger.warn(`Refresh token reuse revoked session ${session.id}`);
      await this.audit.record({ userId: session.userId.toString(), action: "session.reuse_detected", resourceType: "session", resourceId: session.id });
      throw invalidSession();
    }

    const secret = newRefreshSecret();
    const updated = await this.sessions.findOneAndUpdate(
      { _id: session._id, tokenHash: session.tokenHash, revokedAt: null },
      {
        $set: {
          tokenHash: hashRefreshSecret(secret),
          previousTokenHash: session.tokenHash,
          rotatedAt: now,
          lastUsedAt: now,
          ...this.clientFields(client),
        },
      },
      { new: true },
    );
    if (!updated) return { kind: "concurrent" };
    return {
      kind: "rotated",
      userId: updated.userId.toString(),
      sessionId: updated.id,
      refreshToken: formatRefreshToken(updated.id, secret),
      expiresAt: updated.expiresAt,
    };
  }

  async isActive(sessionId: string, userId: string) {
    if (!Types.ObjectId.isValid(sessionId) || !Types.ObjectId.isValid(userId)) return false;
    const active = await this.sessions.exists({
      _id: new Types.ObjectId(sessionId),
      userId: new Types.ObjectId(userId),
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });
    return Boolean(active);
  }

  async revokeByRefreshToken(rawToken: unknown) {
    const parsed = parseRefreshToken(rawToken);
    if (!parsed) return;
    const session = await this.sessions.findById(parsed.sessionId);
    if (session && sameHash(hashRefreshSecret(parsed.secret), session.tokenHash)) {
      await this.revokeDocument(session, "logout");
    }
  }

  async revoke(sessionId: string, userId: string, reason: string) {
    if (!Types.ObjectId.isValid(sessionId)) return;
    await this.sessions.updateOne(
      { _id: new Types.ObjectId(sessionId), userId: new Types.ObjectId(userId), revokedAt: null },
      { $set: { revokedAt: new Date(), revokedReason: reason } },
    );
  }

  async revokeAll(userId: string, reason: string) {
    const result = await this.sessions.updateMany(
      { userId: new Types.ObjectId(userId), revokedAt: null },
      { $set: { revokedAt: new Date(), revokedReason: reason } },
    );
    return result.modifiedCount;
  }

  private async revokeDocument(session: AuthSessionDocument, reason: string) {
    session.revokedAt = new Date();
    session.revokedReason = reason;
    await session.save();
  }

  private clientFields(client: ClientInfo) {
    return {
      userAgent: client.userAgent?.slice(0, 300),
      ip: client.ip?.slice(0, 64),
    };
  }
}

function invalidSession() {
  return new AppException("AUTH_ERROR", "Session expired. Sign in again.", HttpStatus.UNAUTHORIZED);
}
