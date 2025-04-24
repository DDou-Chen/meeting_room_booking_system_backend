import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';

// 免登录
export const SkipLogin = () => SetMetadata('skip-login', true);

// 需要登录
export const RequireLogin = () => SetMetadata('require-login', true);

// 添加权限限制
export const RequirePermission = (...permissions: string[]) =>
  SetMetadata('require-permissions', permissions);

// 从 request 中取出 userInfo
export const UserInfo = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    if (!request.user) {
      return null;
    }

    return data ? request.user[data] : request.user;
  },
);
