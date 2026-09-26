import { Body, Controller, Get, HttpCode, Post, Req, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiTags } from "@nestjs/swagger";
import { loginSchema, registerSchema } from "@atp/validation";
import { Request, Response } from "express";
import { CurrentUser, AuthUser } from "../../common/current-user.decorator";
import { Public } from "../../common/public.decorator";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { ACCESS_COOKIE, REFRESH_COOKIE, clearAuthCookies, setAuthCookies } from "./auth.cookie";
import { AuthService, IssuedTokens } from "./auth.service";
import { ClientInfo } from "./sessions.service";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post("register")
  async register(
    @Body(new ZodValidationPipe(registerSchema)) body: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.register(body as Parameters<AuthService["register"]>[0], clientInfo(request));
    this.setCookies(response, result.tokens);
    return { user: result.user };
  }

  @Public()
  @HttpCode(200)
  @Post("login")
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.login(body as Parameters<AuthService["login"]>[0], clientInfo(request));
    this.setCookies(response, result.tokens);
    return { user: result.user };
  }

  @Public()
  @HttpCode(200)
  @Post("refresh")
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    try {
      const tokens = await this.auth.refresh(cookie(request, REFRESH_COOKIE), clientInfo(request));
      if (tokens) this.setCookies(response, tokens);
      return { refreshed: true };
    } catch (error) {
      clearAuthCookies(response, this.secure());
      throw error;
    }
  }

  @Public()
  @HttpCode(200)
  @Post("logout")
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(cookie(request, REFRESH_COOKIE), cookie(request, ACCESS_COOKIE) ?? bearer(request));
    clearAuthCookies(response, this.secure());
    return { loggedOut: true };
  }

  @HttpCode(200)
  @Post("logout-all")
  async logoutAll(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) response: Response) {
    const revoked = await this.auth.logoutAll(user);
    clearAuthCookies(response, this.secure());
    return { revoked };
  }

  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }

  private setCookies(response: Response, tokens: IssuedTokens) {
    setAuthCookies(
      response,
      { secure: this.secure(), accessTtlSeconds: this.config.getOrThrow<number>("ACCESS_TOKEN_TTL_SECONDS") },
      tokens,
    );
  }

  private secure() {
    return this.config.getOrThrow<boolean>("COOKIE_SECURE");
  }
}

function cookie(request: Request, name: string) {
  const cookies = request.cookies as Record<string, string | undefined> | undefined;
  return cookies?.[name];
}

function bearer(request: Request) {
  const header = request.headers.authorization;
  return header?.startsWith("Bearer ") ? header.slice(7) : undefined;
}

function clientInfo(request: Request): ClientInfo {
  return { userAgent: request.headers["user-agent"], ip: request.ip };
}
