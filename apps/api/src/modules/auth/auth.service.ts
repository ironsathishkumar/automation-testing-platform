import { HttpStatus, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/mongoose";
import { LoginInput, RegisterInput } from "@atp/validation";
import { User as UserView } from "@atp/shared-types";
import * as argon2 from "argon2";
import { Model } from "mongoose";
import { AppException } from "../../common/app.exception";
import { isDuplicateKey } from "../../common/ids";
import { AuditService } from "../audit/audit.service";
import { User, UserDocument } from "./user.schema";

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly users: Model<User>,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
  ) {}

  async register(input: RegisterInput) {
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
      return this.issue(user);
    } catch (error) {
      if (isDuplicateKey(error)) {
        throw new AppException("CONFLICT", "An account with that email already exists", HttpStatus.CONFLICT);
      }
      throw error;
    }
  }

  async login(input: LoginInput) {
    const user = await this.users.findOne({ email: input.email.toLowerCase() }).select("+passwordHash");
    const valid = user ? await argon2.verify(user.passwordHash, input.password) : false;
    if (!user || !valid || user.status !== "active") {
      throw new AppException("AUTH_ERROR", "Invalid email or password", HttpStatus.UNAUTHORIZED);
    }
    return this.issue(user);
  }

  async me(userId: string): Promise<UserView> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new AppException("AUTH_ERROR", "Authentication required", HttpStatus.UNAUTHORIZED);
    }
    return this.present(user);
  }

  private async issue(user: UserDocument) {
    const token = await this.jwt.signAsync({ sub: user.id, email: user.email });
    return { token, user: this.present(user) };
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
