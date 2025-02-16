import { Body, Controller, Get, Post } from '@nestjs/common';
import { startTradingService } from './start-trading.service';
import { startTradingDto } from './dto/start-trading.dto';

@Controller('status')
export class StatusTradingController {
  constructor(private readonly startTradingService: startTradingService) { }
  @Get('status-trading')
  async getStatus() {
    return this.startTradingService.getStatusTrading(); // Giả sử bạn có phương thức getStatus trong service
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
