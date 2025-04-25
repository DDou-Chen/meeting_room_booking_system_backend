import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

// 修改个人信息
export class UpdateUserDto {
  // headPic 和 nickName 就不做非空约束了，也就是说可以不改
  headPic: string;

  nickName: string;

  @IsNotEmpty({
    message: '邮箱不能为空',
  })
  @IsEmail(
    {},
    {
      message: '不是合法的邮箱格式',
    },
  )
  email: string;

  @IsNotEmpty({
    message: '验证码不能为空',
  })
  captcha: string;
}
