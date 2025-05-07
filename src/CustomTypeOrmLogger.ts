import { WinstonLogger } from 'nest-winston';
import { Logger, QueryRunner } from 'typeorm';

// 自定义 TypeORM 的 Logger
// 实现 typeorm 的 Logger 接口，实现各种方法
export class CustomTypeOrmLogger implements Logger {
  constructor(private winstonLogger: WinstonLogger) {}

  log(level: 'log' | 'info' | 'warn', message: any, queryRunner?: QueryRunner) {
    this.winstonLogger.log(message);
  }

  logQuery(query: string, parameters?: any[], queryRunner?: QueryRunner) {
    this.winstonLogger.log({ sql: query, parameters });
  }

  logQueryError(error: string, query: string, parameters?: any[], queryRunner?: QueryRunner) {
    this.winstonLogger.error({ sql: query, parameters });
  }

  logQuerySlow(time: number, query: string, parameters?: any[], queryRunner?: QueryRunner) {
    this.winstonLogger.log({ sql: query, parameters, time });
  }

  logMigration(message: string, queryRunner?: QueryRunner) {
    this.winstonLogger.log(message);
  }

  logSchemaBuild(message: string, queryRunner?: QueryRunner) {
    this.winstonLogger.log(message);
  }
}
