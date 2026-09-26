import { Body, Controller, Get, HttpCode, Post, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiTags } from "@nestjs/swagger";
import { loginSchema, registerSchema } from "@atp/validation";
import { Response } from "express";
import { CurrentUser, AuthUser } from "../../common/current-user.decorator";
import { Public } from "../../common/public.decorator";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { TOKEN_COOKIE, cookieOptions } from "./auth.cookie";
import { AuthService } from "./auth.service";

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
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.register(body as Parameters<AuthService["register"]>[0]);
    this.setCookie(response, result.token);
    return { user: result.user };
  }

  @Public()
  @HttpCode(200)
  @Post("login")
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.login(body as Parameters<AuthService["login"]>[0]);
    this.setCookie(response, result.token);
    return { user: result.user };
  }

  @Public()
  @HttpCode(200)
  @Post("logout")
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(TOKEN_COOKIE, { path: "/" });
    return { loggedOut: true };
  }

  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }

  private setCookie(response: Response, token: string) {
    const expiresIn = this.config.get<string>("JWT_EXPIRES_IN") ?? "7d";
    response.cookie(TOKEN_COOKIE, token, cookieOptions(expiresIn));
  }
}
