import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { User } from './user/entities/user.entity';
import { Role } from './user/entities/role.entity';
import { Permission } from './user/entities/permission.entity';
import { RedisModule } from './redis/redis.module';
import { EmailModule } from './email/email.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { LoginGuard } from './login.guard';
import { PermissionGuard } from './permission.guard';
import { MeetingRoomModule } from './meeting-room/meeting-room.module';
import { MeetingRoom } from './meeting-room/entities/meeting-room.entity';
import { BookingModule } from './booking/booking.module';
import { Booking } from './booking/entities/booking.entity';
import { StatisticModule } from './statistic/statistic.module';
import * as path from 'path';
import { utilities, WinstonModule, WinstonLogger, WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import * as winston from 'winston';
import { CustomTypeOrmLogger } from './CustomTypeOrmLogger';
import 'winston-daily-rotate-file';

@Module({
  imports: [
    WinstonModule.forRootAsync({
      useFactory: () => ({
        level: 'debug',
        transports: [
          // 不好维护，日志会越来越大
          // new winston.transports.File({
          //   filename: `${process.cwd()}/log`,
          // }),

          // 换成按照日期来分割日志
          new winston.transports.DailyRotateFile({
            level: 'debug',
            dirname: 'daily-log',
            filename: 'log-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxSize: '10k', // 文件最大的大小为 10k
          }),

          new winston.transports.Console({
            format: winston.format.combine(winston.format.timestamp(), utilities.format.nestLike()),
          }),
          // 加一个 Http 的 transport 来上传日志
          new winston.transports.Http({
            host: 'localhost',
            port: 3002,
            path: '/log',
          }),
        ],
      }),
    }),
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
      // 当指定多个 .env 文件时，配置会做合并，但是相同的 key 前面的配置生效
      // envFilePath: [path.join(__dirname, '.env'), path.join(__dirname, '.dev.env')],
      envFilePath:
        process.env.NODE_ENV === 'development' ? path.join(__dirname, '.dev.env') : path.join(__dirname, '.env'),
    }),
    TypeOrmModule.forRootAsync({
      useFactory(configService: ConfigService, logger: WinstonLogger) {
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
          logger: new CustomTypeOrmLogger(logger),
          entities: [User, Role, Permission, MeetingRoom, Booking],
          poolSize: 10,
          connectorPackage: 'mysql2',
          timezone: '+08:00', // 东八区 +8小时
          extra: {
            authPlugin: 'sha256_password',
          },
        };
      },
      inject: [ConfigService, WINSTON_MODULE_NEST_PROVIDER],
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
    MeetingRoomModule,
    BookingModule,
    StatisticModule,
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
