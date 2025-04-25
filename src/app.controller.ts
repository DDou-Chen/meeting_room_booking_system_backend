import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { SkipLogin } from './custom.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @SkipLogin()
  getHello(): string {
    return this.appService.getHello();
  }
}
