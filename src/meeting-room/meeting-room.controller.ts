import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { MeetingRoomService } from './meeting-room.service';
import { generateParseIntPipe } from 'src/utils';
import { CreateMeetingRoomDto } from './dto/create-meeting-room.dto';
import { UpdateMeetingRoomDto } from './dto/update-meeting-room.dto';

@Controller('meeting-room')
export class MeetingRoomController {
  constructor(private readonly meetingRoomService: MeetingRoomService) {}

  // 会议室列表
  @Get('list')
  async getList(
    @Query('pageNo', new DefaultValuePipe(1), generateParseIntPipe('pageNo'))
    pageNo: number,
    @Query(
      'pageSize',
      new DefaultValuePipe(10),
      generateParseIntPipe('pageSize'),
    )
    pageSize: number,
    @Query('name') name: string,
    @Query('capacity') capacity: number,
    @Query('equipment') equipment: string,
  ) {
    return await this.meetingRoomService.getList(
      pageNo,
      pageSize,
      name,
      capacity,
      equipment,
    );
  }

  // 创建会议室
  @Post('create')
  async create(@Body() createMeetRoomDto: CreateMeetingRoomDto) {
    return await this.meetingRoomService.createRoom(createMeetRoomDto);
  }

  @Put('update')
  async update(@Body() updateMeetRoomDto: UpdateMeetingRoomDto) {
    return await this.meetingRoomService.updateRoom(updateMeetRoomDto);
  }

  @Get('find/:id')
  async find(@Param('id') id: number) {
    return await this.meetingRoomService.find(id);
  }

  @Delete('delete/:id')
  async delete(@Param('id') id: number) {
    return await this.meetingRoomService.delete(id);
  }
}
