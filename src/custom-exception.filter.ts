import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';

// 拦截http报错，修改默认的响应格式
@Catch(HttpException)
export class CustomExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    response.statusCode = exception.getStatus();

    // ValidationPip 校验入参报的错 是存在 response.message 里的
    const res = exception.getResponse() as {
      message: string[];
      noFilter?: boolean;
    };

    // 如果有 noFilter 就不做处理
    if (res?.noFilter) {
      const { noFilter, ...rest } = res;
      response.json(rest).end();
      return;
    }

    response
      .json({
        code: exception.getStatus(),
        message: res?.message?.join?.(',') || exception.message, // 如果有 response.message 就优先用那个，否则就取 exception.message
        data: null,
      })
      .end();
  }
}
