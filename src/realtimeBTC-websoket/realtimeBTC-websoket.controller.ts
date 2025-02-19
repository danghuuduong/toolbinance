import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { realtimeBTCWebsoketService } from './realtimeBTC-websoket.service';


@Controller('emaCrossHistory')
export class emaCrossHistoryController {
  constructor(private readonly realtimeBTCWebsoketService: realtimeBTCWebsoketService) {}

  // @Post()
  // create(@Body() CreateRealtimeBtcWebsoketDto: CreateRealtimeBtcWebsoketDto) {
  //   return this.usersService.create(createUserDto);
  // }

  @Get()
  findAll() {
    return this.realtimeBTCWebsoketService.getAllEmaCrossHistory();
  }
}
