import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { EmailService } from 'src/email/email.service';
import { RedisService } from 'src/redis/redis.service';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  RequireLogin,
  RequirePermission,
  SkipLogin,
} from 'src/custom.decorator';

// dto 是接收参数的，vo 是封装返回的数据的，entity 是和数据库表对应的。

@Controller('user')
@SkipLogin()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Inject(JwtService)
  private jwtService: JwtService;

  @Inject(ConfigService)
  private configService: ConfigService;

  @Inject(EmailService)
  private emailService: EmailService;

  @Inject(RedisService)
  private redisService: RedisService;

  @Get('init-data')
  async initData() {
    await this.userService.initData();
    return 'done';
  }

  // 注册
  @Post('register')
  register(@Body() user: RegisterUserDto) {
    console.log('user', user);

    return this.userService.register(user);
  }

  // 发送验证码
  @Get('register-captcha')
  async captcha(@Query('address') address: string) {
    const code = Math.random().toString().slice(2, 8);

    await this.redisService.set(`captcha_${address}`, code, 5 * 60);

    await this.emailService.sendMail({
      to: address,
      subject: '注册验证码',
      html: `<p>你的注册验证码是 ${code}</p>`,
    });
    return '发送成功';
  }

  // 普通用户登录
  @Post('login')
  async login(@Body() loginUser: LoginUserDto) {
    const vo = await this.userService.login(loginUser, false);

    const { accessToken, refreshToken } = this.userService.createUserToken({
      id: vo.userInfo.id,
      username: vo.userInfo.username,
      roles: vo.userInfo.roles,
      permissions: vo.userInfo.permissions,
    });

    vo.accessToken = accessToken;
    vo.refreshToken = refreshToken;

    return vo;
  }

  @Post('admin-login')
  async adminLogin(@Body() loginUser: LoginUserDto) {
    const vo = await this.userService.login(loginUser, true);

    const { accessToken, refreshToken } = this.userService.createUserToken({
      id: vo.userInfo.id,
      username: vo.userInfo.username,
      roles: vo.userInfo.roles,
      permissions: vo.userInfo.permissions,
    });

    vo.accessToken = accessToken;
    vo.refreshToken = refreshToken;

    return vo;
  }

  // 普通用户刷新token
  @Get('refresh')
  @RequireLogin()
  async refresh(@Query('refreshToken') refreshToken: string) {
    try {
      const data = this.jwtService.verify(refreshToken);

      const userInfo = await this.userService.findUserById(data.userId, false);

      const { accessToken, refreshToken: newRefreshToken } =
        this.userService.createUserToken({
          id: userInfo.id,
          username: userInfo.username,
          roles: userInfo.roles,
          permissions: userInfo.permissions,
        });

      return {
        accessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      throw new UnauthorizedException('token 已失效，请重新登录');
    }
  }

  @Get('admin-refresh')
  @RequireLogin()
  async adminRefresh(@Query('refreshToken') refreshToken: string) {
    try {
      const data = this.jwtService.verify(refreshToken);

      const userInfo = await this.userService.findUserById(data.userId, true);

      const { accessToken, refreshToken: newRefreshToken } =
        this.userService.createUserToken({
          id: userInfo.id,
          username: userInfo.username,
          roles: userInfo.roles,
          permissions: userInfo.permissions,
        });

      return {
        accessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      throw new UnauthorizedException('token 已失效，请重新登录');
    }
  }
}
