import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { createClient } from 'redis';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
  providers: [
    RedisService,
    {
      provide: 'REDIS_CLIENT',
      async useFactory(configService: ConfigService) {
        const host = configService.get('redis_server_host');
        const port = configService.get('redis_server_port');
        const database = configService.get('redis_server_db');

        const client = createClient({
          socket: {
            host,
            port,
          },
          database,
        });

        await client.connect();

        return client;
      },
      inject: [ConfigService],
    },
  ],
  exports: [RedisService],
})
export class RedisModule {}
