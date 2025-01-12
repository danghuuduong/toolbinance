import { Global, Module } from '@nestjs/common';
import { StatusTradingService } from './status-trading.service';
import { StatusTradingController } from './status-trading.controller';

@Global()
@Module({
  controllers: [StatusTradingController],
  providers: [StatusTradingService],
  exports:[StatusTradingService]
})
export class StatusTradingModule {}
