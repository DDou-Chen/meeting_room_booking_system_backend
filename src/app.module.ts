import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { User } from './user/entities/User.entity';
import { Role } from './user/entities/role.entity';
import { Permission } from './user/entities/permission.entity';
import { RedisModule } from './redis/redis.module';
import { EmailModule } from './email/email.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { LoginGuard } from './login.guard';
import { PermissionGuard } from './permission.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      useFactory(configService: ConfigService) {
        const getEnvByKey = (key: string) => configService.get(key);
        return {
          secret: getEnvByKey('jwt_secret'),
          signOptions: {
            expiresIn: '30m', // 默认 30 分钟
          },
        };
      },
      inject: [ConfigService],
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'src/.env',
    }),
    TypeOrmModule.forRootAsync({
      useFactory(configService: ConfigService) {
        const getEnvByKey = (key: string) => configService.get(key);

        return {
          type: 'mysql',
          host: getEnvByKey('mysql_server_host'),
          port: getEnvByKey('mysql_server_port'),
          username: getEnvByKey('mysql_server_username'),
          password: getEnvByKey('mysql_server_password'),
          database: getEnvByKey('mysql_server_database'),
          synchronize: true,
          logging: true,
          entities: [User, Role, Permission],
          poolSize: 10,
          connectorPackage: 'mysql2',
          timezone: '+08:00', // 东八区 +8小时
          extra: {
            authPlugin: 'sha256_password',
          },
        };
      },
      inject: [ConfigService],
    }),
    // TypeOrmModule.forRoot({
    //   type: 'mysql',
    //   host: 'localhost',
    //   port: 3306,
    //   username: 'root',
    //   password: 'root',
    //   database: 'meeting_room_booking_system',
    //   synchronize: true,
    //   logging: true,
    //   entities: [User, Role, Permission],
    //   poolSize: 10,
    //   connectorPackage: 'mysql2',
    //   timezone: '+08:00', // 东八区 +8小时
    //   extra: {
    //     authPlugin: 'sha256_password',
    //   },
    // }),
    UserModule,
    RedisModule,
    EmailModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: LoginGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
  ],
})
export class AppModule {}
