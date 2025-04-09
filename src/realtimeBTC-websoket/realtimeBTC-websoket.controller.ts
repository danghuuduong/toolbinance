import {
  Controller,
  Get,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { realtimeBTCWebsoketService } from './realtimeBTC-websoket.service';
import { paramGetEmaCrossHistoryDto } from './dto/param-ema-cross-history.dto';


@Controller('emaCrossHistory')
export class emaCrossHistoryController {
  constructor(private readonly realtimeBTCWebsoketService: realtimeBTCWebsoketService) { }

  @Get()
  async getEmaCrossHistory(@Query() query: paramGetEmaCrossHistoryDto) {
    return this.realtimeBTCWebsoketService.getAllEmaCrossHistory({
      page: query.page,
      limit: query.limit || 10,
    });
  }

}
