import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { StatusTradingService } from './status-trading.service';
import { CreateStatusTradingDto } from './dto/create-status-trading.dto';

@Controller('status')
export class StatusTradingController {
  constructor(private readonly statusTradingService: StatusTradingService) {}

  @Post('start-trading')
  async startTrading() {
    return this.statusTradingService.startTrading();
  }

  @Post('stop-trading')
  async stopTrading() {
    return this.statusTradingService.stopTrading();
  }

}
