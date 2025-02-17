import { Global, Module } from '@nestjs/common';
import { startTradingService } from './start-trading.service';
import { StatusTradingController } from './start-trading.controller';

@Global()
@Module({
  controllers: [StatusTradingController],
  providers: [startTradingService],
  exports: [startTradingService],
})
export class StatusTradingModule {}
