import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { PassportModule } from "@nestjs/passport";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { AuditModule } from "../audit/audit.module";
import { AuthSession, AuthSessionSchema } from "./auth-session.schema";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JWT_AUDIENCE, JWT_ISSUER } from "./jwt.constants";
import { JwtStrategy } from "./jwt.strategy";
import { SessionsService } from "./sessions.service";
import { User, UserSchema } from "./user.schema";

@Module({
  imports: [
    AuditModule,
    PassportModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: AuthSession.name, schema: AuthSessionSchema },
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("JWT_SECRET"),
        signOptions: {
          algorithm: "HS256",
          expiresIn: config.getOrThrow<number>("ACCESS_TOKEN_TTL_SECONDS"),
          issuer: JWT_ISSUER,
          audience: JWT_AUDIENCE,
        },
        verifyOptions: {
          algorithms: ["HS256"],
          issuer: JWT_ISSUER,
          audience: JWT_AUDIENCE,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, SessionsService, JwtStrategy, { provide: APP_GUARD, useClass: JwtAuthGuard }],
  exports: [AuthService],
})
export class AuthModule {}
