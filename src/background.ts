import { NestFactory } from "@nestjs/core";

import { BackgroundModule } from "./modules/background/background.module";

async function bootstrap() {
  await NestFactory.createApplicationContext(BackgroundModule);
}

bootstrap();
