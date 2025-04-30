import { BadRequestException, ClassSerializerInterceptor, Inject, Injectable, UseInterceptors } from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  EntityManager,
  LessThan,
  LessThanOrEqual,
  Like,
  MoreThan,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { MeetingRoom } from 'src/meeting-room/entities/meeting-room.entity';
import { Booking } from './entities/booking.entity';
import { RedisService } from 'src/redis/redis.service';
import { EmailService } from 'src/email/email.service';

@Injectable()
export class BookingService {
  @InjectEntityManager()
  private entityManager: EntityManager;

  @InjectRepository(Booking)
  private bookingRepository: Repository<Booking>;

  @Inject(RedisService)
  private redisService: RedisService;

  @Inject(EmailService)
  private emailService: EmailService;

  async initData() {
    // 查询出 2 个 User ，2 个 MeetingRoom，然后创建 4 个 Booking
    const user1 = await this.entityManager.findOneBy(User, {
      id: 1,
    });
    const user2 = await this.entityManager.findOneBy(User, {
      id: 2,
    });

    const room1 = await this.entityManager.findOneBy(MeetingRoom, {
      id: 3,
    });
    const room2 = await await this.entityManager.findOneBy(MeetingRoom, {
      id: 6,
    });

    const booking1 = new Booking();
    booking1.room = room1;
    booking1.user = user1;
    booking1.startTime = new Date();
    booking1.endTime = new Date(Date.now() + 1000 * 60 * 60);

    await this.entityManager.save(Booking, booking1);

    const booking2 = new Booking();
    booking2.room = room2;
    booking2.user = user2;
    booking2.startTime = new Date();
    booking2.endTime = new Date(Date.now() + 1000 * 60 * 60);

    await this.entityManager.save(Booking, booking2);

    const booking3 = new Booking();
    booking3.room = room1;
    booking3.user = user2;
    booking3.startTime = new Date();
    booking3.endTime = new Date(Date.now() + 1000 * 60 * 60);

    await this.entityManager.save(Booking, booking3);

    const booking4 = new Booking();
    booking4.room = room2;
    booking4.user = user1;
    booking4.startTime = new Date();
    booking4.endTime = new Date(Date.now() + 1000 * 60 * 60);

    await this.entityManager.save(Booking, booking4);
  }

  @UseInterceptors(ClassSerializerInterceptor)
  async find(
    pageNo: number,
    pageSize: number,
    username: string,
    meetingRoomName: string,
    meetingRoomPosition: string,
    bookingTimeRangeStart: number,
    bookingTimeRangeEnd: number,
  ) {
    const skipCount = (pageNo - 1) * pageSize;

    const condition: Record<string, any> = {};
    if (username) {
      condition.user = {
        username: Like(`%${username}%`),
      };
    }
    if (meetingRoomName) {
      condition.room = {
        name: Like(`%${meetingRoomName}%`),
      };
    }
    if (meetingRoomPosition) {
      if (!condition.room) {
        condition.room = {};
      }
      condition.room.location = Like(`%${meetingRoomPosition}%`);
    }
    if (bookingTimeRangeStart) {
      // 如果 endTime 没传入，那就用 startTime + 一小时 来搜索
      if (!bookingTimeRangeEnd) {
        bookingTimeRangeEnd = bookingTimeRangeStart + 60 * 60 * 1000;
      }
      condition.startTime = Between(new Date(bookingTimeRangeStart), new Date(bookingTimeRangeEnd));
    }

    const [list, count] = await this.bookingRepository.findAndCount({
      skip: skipCount,
      take: pageSize,
      where: condition,
      relations: {
        user: true,
        room: true,
      },
    });

    return {
      list,
      count,
    };
  }

  async add(bookingDto: CreateBookingDto, userId: number) {
    const room = await this.entityManager.findOneBy(MeetingRoom, { id: bookingDto.meetingRoomId });
    if (!room) {
      throw new BadRequestException('会议室id错误');
    }

    const user = await this.entityManager.findOneBy(User, { id: userId });

    const booking = new Booking();
    booking.room = room;
    booking.user = user;
    booking.startTime = new Date(bookingDto.startTime);
    booking.endTime = new Date(bookingDto.endTime);

    const res = await this.bookingRepository.findOneBy({
      room: room,
      startTime: LessThan(booking.endTime),
      endTime: MoreThan(booking.startTime),
    });

    if (res) {
      throw new BadRequestException('会议室已被预定，请选择其他时间段');
    }
    if (booking.startTime.getTime() >= booking.endTime.getTime()) {
      throw new BadRequestException('结束时间必须晚于开始时间');
    }

    try {
      await this.bookingRepository.save(booking);
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  async apply(id: number) {
    await this.entityManager.update(Booking, { id }, { status: '审批通过' });
    return 'success';
  }

  async reject(id: number) {
    await this.entityManager.update(Booking, { id }, { status: '审批驳回' });
    return 'success';
  }

  async unbind(id: number) {
    await this.entityManager.update(Booking, { id }, { status: '已解除' });
    return 'success';
  }

  async urge(id: number) {
    // 用 redisService 查询 flag，查到的话就提醒半小时内只能催办一次
    const flag = await this.redisService.get('urge_' + id);

    if (flag) {
      return '半小时内只能催办一次，请耐心等待';
    }

    // 用 redisService 查询 admin 的邮箱，没查到的话到数据库查，然后存到 redis
    let email = await this.redisService.get('admin_email');

    if (!email) {
      const admin = await this.entityManager.findOne(User, {
        select: {
          email: true,
        },
        where: {
          isAdmin: true,
        },
      });

      email = admin.email;

      this.redisService.set('admin_email', admin.email);
    }

    // 发催办邮件
    this.emailService.sendMail({
      to: email,
      subject: '预定申请催办提醒',
      html: `id 为 ${id} 的预定申请正在等待审批`,
    });

    // 在 redis 里存一个 30 分钟的 flag
    this.redisService.set('urge_' + id, 1, 60 * 30);
  }

  create(createBookingDto: CreateBookingDto) {
    return 'This action adds a new booking';
  }

  findAll() {
    return `This action returns all booking`;
  }

  findOne(id: number) {
    return `This action returns a #${id} booking`;
  }

  update(id: number, updateBookingDto: UpdateBookingDto) {
    return `This action updates a #${id} booking`;
  }

  remove(id: number) {
    return `This action removes a #${id} booking`;
  }
}
