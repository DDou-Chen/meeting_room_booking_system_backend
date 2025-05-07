import { OmitType, PickType } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';
import { RegisterUserDto } from './register-user.dto';

// 修改密码
export class UpdateUserPasswordDto extends PickType(RegisterUserDto, ['username', 'password', 'email', 'captcha']) {}
