import { Controller, Get, Post } from '@nestjs/common';
import { StatusTradingService } from './status-trading.service';

@Controller('status')
export class StatusTradingController {
  constructor(private readonly statusTradingService: StatusTradingService) {}
  @Get('status-trading')
  async getStatus() {
    return this.statusTradingService.getStatusTrading(); // Giả sử bạn có phương thức getStatus trong service
  }

  @Post('start-trading')
  async startTrading() {
    return this.statusTradingService.startTrading();
  }

  @Post('stop-trading')
  async stopTrading() {
    return this.statusTradingService.stopTrading();
  }
}
