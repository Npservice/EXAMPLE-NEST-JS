import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({ credentials: true });
  app.use(cookieParser());
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      // Error validasi jadi { field: pesan }, contoh { email: 'format email tidak valid' }.
      exceptionFactory: (errors) =>
        new BadRequestException({
          message: 'Validation Failed',
          data: Object.fromEntries(
            errors.map((e) => [
              e.property,
              Object.values(e.constraints ?? {})[0],
            ]),
          ),
        }),
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
