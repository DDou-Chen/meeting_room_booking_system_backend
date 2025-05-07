import { HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { RegisterUserDto } from './dto/register-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Like, Repository } from 'typeorm';
import { RedisService } from 'src/redis/redis.service';
import { md5 } from 'src/utils';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { LoginUserDto } from './dto/login-user.dto';
import { LoginUserVo } from './vo/login-user.vo';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserDetailVo } from './vo/info-user.vo';
import { UpdateUserPasswordDto } from './dto/update-user-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  private logger = new Logger();

  @InjectRepository(User)
  private userRepository: Repository<User>;

  @InjectRepository(Role)
  private roleRepository: Repository<Role>;

  @InjectRepository(Permission)
  private permissionRepository: Repository<Permission>;

  @Inject(RedisService)
  private redisService: RedisService;

  @Inject(JwtService)
  private jwtService: JwtService;

  @Inject(ConfigService)
  private configService: ConfigService;

  async initData() {
    const user1 = new User();
    user1.username = 'zhangsan';
    user1.password = md5('111111');
    user1.email = 'xxx@xx.com';
    user1.isAdmin = true;
    user1.nickName = '张三';
    user1.phoneNumber = '13233323333';

    const user2 = new User();
    user2.username = 'lisi';
    user2.password = md5('222222');
    user2.email = 'yy@yy.com';
    user2.nickName = '李四';

    const role1 = new Role();
    role1.name = '管理员';

    const role2 = new Role();
    role2.name = '普通用户';

    const permission1 = new Permission();
    permission1.code = 'ccc';
    permission1.description = '访问 ccc 接口';

    const permission2 = new Permission();
    permission2.code = 'ddd';
    permission2.description = '访问 ddd 接口';

    user1.roles = [role1];
    user2.roles = [role1, role2];

    role1.permissions = [permission1, permission2];
    role2.permissions = [permission1];

    await this.permissionRepository.save([permission1, permission2]);
    await this.roleRepository.save([role1, role2]);
    await this.userRepository.save([user1, user2]);
  }

  async register(user: RegisterUserDto) {
    const { email, captcha, username } = user;

    const r_captcha = await this.redisService.get(`captcha_${email}`);
    if (!captcha) {
      throw new HttpException('验证码已失效', HttpStatus.BAD_REQUEST);
    }

    if (captcha !== r_captcha) {
      throw new HttpException('验证码不正确', HttpStatus.BAD_REQUEST);
    }

    const foundUser = await this.userRepository.findOneBy({ username });

    if (foundUser) {
      throw new HttpException('用户已存在', HttpStatus.BAD_REQUEST);
    }

    const newUser = new User();
    newUser.username = user.username;
    newUser.password = md5(user.password);
    newUser.email = user.email;
    newUser.nickName = user.nickName;

    try {
      await this.userRepository.save(newUser);
      return '注册成功';
    } catch (error) {
      this.logger.error(error, UserService);
      return '注册失败';
    }
  }

  async login(user: LoginUserDto, isAdmin: boolean) {
    const foundUser = await this.userRepository.findOne({
      where: {
        username: user.username,
        isAdmin,
      },
      relations: ['roles', 'roles.permissions'],
    });

    if (!foundUser) {
      throw new HttpException('用户不存在', HttpStatus.BAD_REQUEST);
    }

    if (foundUser.password !== md5(user.password)) {
      throw new HttpException('密码错误', HttpStatus.BAD_REQUEST);
    }

    const vo = new LoginUserVo();
    const { password, roles, createTime, ...rest } = foundUser;

    vo.userInfo = {
      ...rest,
      createTime: 0,
      ...this.handleVoRoleAndPermission(roles),
    };

    const { accessToken, refreshToken } = this.createUserToken(foundUser);
    vo.accessToken = accessToken;
    vo.refreshToken = refreshToken;

    return vo;
  }

  // 处理 vo 输出的 roles 和 permissions 字段
  handleVoRoleAndPermission(roles: Role[]) {
    return {
      roles: roles.map((item) => item.name),
      // permissions 是所有 roles 的 permissions 的合并，要去下重
      permissions: [
        // Map 的键值是唯一的，所以用 code 值来做键值，去重
        ...new Map(
          roles.flatMap((item) => item.permissions).map((permission) => [permission.code, permission]),
        ).values(),
      ],
    };
  }

  createUserToken(userInfo: User) {
    const accessToken = this.jwtService.sign(
      {
        userId: userInfo.id,
        username: userInfo.username,
        ...this.handleVoRoleAndPermission(userInfo.roles),
        email: userInfo.email,
      },
      {
        expiresIn: this.configService.get('jwt_access_token_expires_time') || '30m',
      },
    );

    const refreshToken = this.jwtService.sign(
      {
        userId: userInfo.id,
      },
      {
        expiresIn: this.configService.get('jwt_refresh_token_expres_time') || '7d',
      },
    );

    return { accessToken, refreshToken };
  }

  async findUserById(userId: number, isAdmin) {
    const user = await this.userRepository.findOne({
      where: {
        id: userId,
        isAdmin,
      },
      relations: ['roles', 'roles.permissions'],
    });

    if (!user) return null;

    return user;
  }

  async getInfo(userId: number) {
    const user = await this.userRepository.findOneBy({ id: userId });

    const vo = new UserDetailVo();

    vo.id = user.id;
    vo.username = user.username;
    vo.nickName = user.nickName;
    vo.email = user.email;
    vo.headPic = user.headPic;
    vo.phoneNumber = user.phoneNumber;
    vo.isFrozen = user.isFrozen;
    vo.createTime = user.createTime;

    return vo;
  }

  async updatePassword(passwordDto: UpdateUserPasswordDto) {
    const { email, captcha, password } = passwordDto;
    const r_captcha = await this.redisService.get(`update_password_captcha_${email}`);
    if (!captcha) {
      throw new HttpException('验证码已失效', HttpStatus.BAD_REQUEST);
    }

    if (captcha !== r_captcha) {
      throw new HttpException('验证码不正确', HttpStatus.BAD_REQUEST);
    }

    const user = await this.userRepository.findOneBy({
      username: passwordDto.username,
    });

    if (user.email !== passwordDto.email) {
      throw new HttpException('邮箱不正确', HttpStatus.BAD_REQUEST);
    }

    user.password = md5(password);

    try {
      await this.userRepository.save(user);
      this.redisService.del(`update_password_captcha_${email}`);
      return '密码修改成功';
    } catch (error) {
      this.logger.error(error, UserService);
      return '密码修改失败';
    }
  }

  async update(userId: number, updateUserDto: UpdateUserDto) {
    const captcha = await this.redisService.get(`update_user_captcha_${updateUserDto.email}`);

    if (!captcha) {
      throw new HttpException('验证码已失效', HttpStatus.BAD_REQUEST);
    }

    if (updateUserDto.captcha !== captcha) {
      throw new HttpException('验证码不正确', HttpStatus.BAD_REQUEST);
    }

    const user = await this.userRepository.findOneBy({ id: userId });

    if (updateUserDto.headPic) {
      user.headPic = updateUserDto.headPic;
    }

    if (updateUserDto.nickName) {
      user.nickName = updateUserDto.nickName;
    }

    try {
      await this.userRepository.save(user);
      this.redisService.del(`update_user_captcha_${updateUserDto.email}`);
      return '修改成功';
    } catch (error) {
      this.logger.error(error, UserService);
      return '修改失败';
    }
  }

  async freezeUserById(userId: number) {
    const user = await this.userRepository.findOneBy({ id: userId });

    user.isFrozen = true;

    try {
      await this.userRepository.save(user);
    } catch (error) {
      throw new HttpException('修改失败', HttpStatus.BAD_REQUEST);
    }
  }

  async findUsers(pageNo: number, pageSize: number, username: string, nickName: string, email: string) {
    const skipCount = (pageNo - 1) * pageSize;

    const condition: Record<string, any> = {};

    if (username) {
      condition.username = Like(`%${username}%`); // 模糊查询
    }
    if (nickName) {
      condition.nickName = Like(`%${nickName}%`);
    }
    if (email) {
      condition.email = Like(`%${email}%`);
    }

    const [users, totalCount] = await this.userRepository.findAndCount({
      skip: skipCount,
      take: pageSize,
      where: condition,
    });

    return {
      users,
      totalCount,
    };
  }
}
