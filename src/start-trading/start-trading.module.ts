import { Global, Module } from '@nestjs/common';
import { startTradingService } from './start-trading.service';
import { StatusTradingController } from './start-trading.controller';
import { HandleFoldingServiceModule } from 'src/common/until/handleFoldingToMoney/handleFolding.module';

@Global()
@Module({
  imports: [HandleFoldingServiceModule],
  controllers: [StatusTradingController],
  providers: [startTradingService],
  exports: [startTradingService],
})
export class StatusTradingModule { }
