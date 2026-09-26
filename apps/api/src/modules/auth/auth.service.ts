import { HttpStatus, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/mongoose";
import { LoginInput, RegisterInput } from "@atp/validation";
import { User as UserView } from "@atp/shared-types";
import * as argon2 from "argon2";
import { Model, Types } from "mongoose";
import { AppException } from "../../common/app.exception";
import { AuthUser } from "../../common/current-user.decorator";
import { isDuplicateKey } from "../../common/ids";
import { AuditService } from "../audit/audit.service";
import { ClientInfo, SessionsService } from "./sessions.service";
import { User, UserDocument } from "./user.schema";

export interface AccessPayload {
  sub: string;
  email: string;
  sid: string;
  typ: "access";
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly users: Model<User>,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
    private readonly sessions: SessionsService,
  ) {}

  async register(input: RegisterInput, client: ClientInfo) {
    const passwordHash = await argon2.hash(input.password);
    try {
      const user = await this.users.create({
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email.toLowerCase(),
        passwordHash,
        status: "active",
      });
      await this.audit.record({
        userId: user.id,
        action: "user.register",
        resourceType: "user",
        resourceId: user.id,
      });
      return { tokens: await this.startSession(user, client), user: this.present(user) };
    } catch (error) {
      if (isDuplicateKey(error)) {
        throw new AppException("CONFLICT", "An account with that email already exists", HttpStatus.CONFLICT);
      }
      throw error;
    }
  }

  async login(input: LoginInput, client: ClientInfo) {
    const user = await this.users.findOne({ email: input.email.toLowerCase() }).select("+passwordHash");
    const valid = user ? await argon2.verify(user.passwordHash, input.password) : false;
    if (!user || !valid || user.status !== "active") {
      throw new AppException("AUTH_ERROR", "Invalid email or password", HttpStatus.UNAUTHORIZED);
    }
    return { tokens: await this.startSession(user, client), user: this.present(user) };
  }

  async refresh(rawRefreshToken: unknown, client: ClientInfo): Promise<IssuedTokens | null> {
    const rotation = await this.sessions.rotate(rawRefreshToken, client);
    if (rotation.kind === "concurrent") return null;
    const user = await this.users.findById(rotation.userId);
    if (!user || user.status !== "active") {
      await this.sessions.revoke(rotation.sessionId, rotation.userId, "user_inactive");
      throw new AppException("AUTH_ERROR", "Session expired. Sign in again.", HttpStatus.UNAUTHORIZED);
    }
    return {
      accessToken: await this.signAccess(user, rotation.sessionId),
      refreshToken: rotation.refreshToken,
      refreshExpiresAt: rotation.expiresAt,
    };
  }

  async validateAccess(payload: Partial<AccessPayload>): Promise<AuthUser | null> {
    if (payload.typ !== "access" || !payload.sub || !payload.sid || !Types.ObjectId.isValid(payload.sub)) return null;
    const [active, user] = await Promise.all([
      this.sessions.isActive(payload.sid, payload.sub),
      this.users.exists({ _id: new Types.ObjectId(payload.sub), status: "active" }),
    ]);
    if (!active || !user) return null;
    return { id: payload.sub, email: payload.email ?? "", sessionId: payload.sid };
  }

  async logout(rawRefreshToken: unknown, rawAccessToken: unknown) {
    await this.sessions.revokeByRefreshToken(rawRefreshToken);
    const payload = await this.readAccess(rawAccessToken);
    if (payload) await this.sessions.revoke(payload.sid, payload.sub, "logout");
  }

  async logoutAll(user: AuthUser) {
    const revoked = await this.sessions.revokeAll(user.id, "logout_all");
    await this.audit.record({ userId: user.id, action: "session.logout_all", resourceType: "user", resourceId: user.id, metadata: { revoked } });
    return revoked;
  }

  async me(userId: string): Promise<UserView> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new AppException("AUTH_ERROR", "Authentication required", HttpStatus.UNAUTHORIZED);
    }
    return this.present(user);
  }

  private async startSession(user: UserDocument, client: ClientInfo): Promise<IssuedTokens> {
    const session = await this.sessions.create(user.id, client);
    return {
      accessToken: await this.signAccess(user, session.sessionId),
      refreshToken: session.refreshToken,
      refreshExpiresAt: session.expiresAt,
    };
  }

  private signAccess(user: UserDocument, sessionId: string) {
    const payload: AccessPayload = { sub: user.id, email: user.email, sid: sessionId, typ: "access" };
    return this.jwt.signAsync(payload);
  }

  private async readAccess(token: unknown): Promise<AccessPayload | null> {
    if (typeof token !== "string" || !token) return null;
    try {
      const payload = await this.jwt.verifyAsync<AccessPayload>(token, { ignoreExpiration: true });
      return payload.typ === "access" && payload.sid && payload.sub ? payload : null;
    } catch {
      return null;
    }
  }

  private present(user: UserDocument): UserView {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
