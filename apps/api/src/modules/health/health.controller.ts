import { Controller, Get } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { ApiTags } from "@nestjs/swagger";
import { Connection } from "mongoose";
import { Public } from "../../common/public.decorator";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Public()
  @Get()
  status() {
    return {
      status: "ok" as const,
      mongo: this.connection.readyState === 1 ? ("up" as const) : ("down" as const),
    };
  }
}
