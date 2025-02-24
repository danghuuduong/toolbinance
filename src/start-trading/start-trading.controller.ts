import { Body, Controller, Get, HttpStatus, Post } from '@nestjs/common';
import { startTradingService } from './start-trading.service';
import { startTradingDto } from './dto/start-trading.dto';

@Controller('status')
export class StatusTradingController {
  constructor(private readonly startTradingService: startTradingService) { }
  @Get("start-trading-get")
  async getStartTrading() {
    const result = await this.startTradingService.getStartTradingData();
    return result;
  }

  @Post('start-trading')
  async startTrading(@Body() startTradingDto: startTradingDto) {
    return this.startTradingService.startTrading(startTradingDto);
  }

  @Post('stop-trading')
  async stopTrading() {
    return this.startTradingService.stopTrading();
  }
}
