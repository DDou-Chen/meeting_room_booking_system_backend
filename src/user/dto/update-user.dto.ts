import { PickType } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';
import { RegisterUserDto } from './register-user.dto';

// 修改个人信息
export class UpdateUserDto extends PickType(RegisterUserDto, ['email', 'captcha']) {
  // headPic 和 nickName 就不做非空约束了，也就是说可以不改
  headPic: string;

  nickName: string;
}
