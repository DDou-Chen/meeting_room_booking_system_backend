import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { MeetingRoom } from './entities/meeting-room.entity';
import { EntityManager, Like, Repository } from 'typeorm';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { CreateMeetingRoomDto } from './dto/create-meeting-room.dto';
import { UpdateMeetingRoomDto } from './dto/update-meeting-room.dto';
import { Booking } from 'src/booking/entities/booking.entity';

@Injectable()
export class MeetingRoomService {
  @InjectRepository(MeetingRoom)
  private meetRepository: Repository<MeetingRoom>;

  @InjectEntityManager()
  entityManager: EntityManager;

  initData() {
    const room1 = new MeetingRoom();
    room1.name = '木星';
    room1.capacity = 10;
    room1.equipment = '白板';
    room1.location = '一层西';

    const room2 = new MeetingRoom();
    room2.name = '金星';
    room2.capacity = 5;
    room2.equipment = '';
    room2.location = '二层东';

    const room3 = new MeetingRoom();
    room3.name = '天王星';
    room3.capacity = 30;
    room3.equipment = '白板，电视';
    room3.location = '三层东';

    this.meetRepository.insert([room1, room2, room3]);
  }

  async getList(
    pageNo: number,
    pageSize: number,
    name: string,
    capacity: number,
    equipment: string,
  ) {
    if (pageNo < 1) {
      throw new BadRequestException('页码最小为 1');
    }

    const skipCount = (pageNo - 1) * pageSize;

    const condition: Record<string, any> = {};
    if (name) {
      condition.name = Like(`%${name}%`);
    }
    if (equipment) {
      condition.equipment = Like(`%${equipment}%`);
    }
    if (capacity) {
      condition.capacity = capacity;
    }

    const [list, count] = await this.meetRepository.findAndCount({
      skip: skipCount,
      take: pageSize,
      where: condition,
    });

    return { list, count };
  }

  async createRoom(meetRoomDto: CreateMeetingRoomDto) {
    const room = await this.meetRepository.findOneBy({
      name: meetRoomDto.name,
    });
    if (room) {
      throw new BadRequestException('会议室名字已存在');
    }

    try {
      await this.meetRepository.insert(meetRoomDto);
      return 'success';
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  async updateRoom(meetRoomDto: UpdateMeetingRoomDto) {
    const { id, ...rest } = meetRoomDto;

    const room = await this.meetRepository.findOneBy({ id: meetRoomDto.id });

    if (!room) {
      throw new BadRequestException('会议室不存在');
    }

    Object.keys(rest).forEach((key) => {
      room[key] = rest[key];
    });

    try {
      await this.meetRepository.update({ id }, room);
      return 'success';
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  async find(id: number) {
    const room = await this.meetRepository.findOneBy({ id });

    return room;
  }

  async delete(id: number) {
    try {
      // 因为 booking 表关联了 meeting-room 表，有外键约束，所以要删除所有的预定之后再去删除会议室
      const bookings = await this.entityManager.findBy(Booking, {
        room: { id },
      });

      for (let i = 0; i < bookings.length; i++) {
        this.entityManager.delete(Booking, bookings[i].id);
      }
      await this.meetRepository.delete(id);

      return 'success';
    } catch (error) {
      throw new BadRequestException(error);
    }
  }
}
