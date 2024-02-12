import { ZodValidationPipe } from "@anatine/zod-nestjs";
import { patchNestjsSwagger } from "@anatine/zod-nestjs";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.useGlobalPipes(new ZodValidationPipe());

  patchNestjsSwagger();
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .addBearerAuth()
      .setTitle("MRKT marketplace API docs")
      .setVersion("1.0")
      .build()
  );

  SwaggerModule.setup("docs", app, document);

  await app.listen(8080);
}

bootstrap();
