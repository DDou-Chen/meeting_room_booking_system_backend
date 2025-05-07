import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FormatResponseInterceptor } from './format-response.interceptor';
import { InvokeRecordInterceptor } from './invoke-record.interceptor';
import { CustomExceptionFilter } from './custom-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalInterceptors(new FormatResponseInterceptor());
  app.useGlobalInterceptors(new InvokeRecordInterceptor());
  app.useGlobalFilters(new CustomExceptionFilter());

  // 添加 uploads 目录为静态目录
  app.useStaticAssets('uploads', {
    prefix: '/uploads', // 指定通过 /uploads 的前缀访问
  });

  const config = new DocumentBuilder()
    .setTitle('会议室预定系统')
    .setVersion('1.0')
    .setDescription('api 接口文档')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-doc', app, document);

  const serverPort = app.get(ConfigService).get('nest_server_port');

  // 把 winston 的 logger 设置为 Nest 的默认 Logger
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  await app.listen(serverPort);
}
bootstrap();
