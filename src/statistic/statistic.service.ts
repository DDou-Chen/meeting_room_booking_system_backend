import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Booking } from 'src/booking/entities/booking.entity';
import { User } from 'src/user/entities/user.entity';
import { EntityManager } from 'typeorm';

@Injectable()
export class StatisticService {
  @InjectEntityManager()
  private entityManager: EntityManager;

  async userBookingCount(startTime: string, endTime: string) {
    const res = await this.entityManager
      .createQueryBuilder(Booking, 'b') // 统计相关的 sql 比较复杂，使用 queryBuilder 的 api
      .select('u.id', 'userId') // 设置别名
      .addSelect('u.username', 'username')
      .leftJoin(User, 'u', 'b.userId=u.id')
      .addSelect('count(*)', 'bookingCount')
      .where('b.startTime between :time1 and :time2', {
        time1: startTime,
        time2: endTime,
      })
      .addGroupBy('b.user')
      .getRawMany();

    return res;
  }
}
