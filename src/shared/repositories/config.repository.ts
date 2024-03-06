import { Injectable } from "@nestjs/common";

import { PrismaService } from "@root/libs/prisma/prisma.service";

type Config = "current_height";

@Injectable()
export class ConfigRepository {
  constructor(private prisma: PrismaService) {}

  public async get(key: Config) {
    const config = await this.prisma.config.findFirst({
      where: {
        key
      }
    });

    return config?.value;
  }

  public set(key: Config, value: string) {
    return this.prisma.config.update({
      where: {
        key
      },
      data: {
        value
      }
    });
  }

  public upset(key: Config, value: string) {
    return this.prisma.config.upsert({
      where: {
        key
      },
      create: {
        key,
        value
      },
      update: {
        value
      }
    });
  }
}
