import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CandleModule } from './candle/candle.module';
import { CandlestickModule } from './realtimeBTC/candlestick.module';
import { StatusTradingModule } from './status-trading/status-trading.module';
@Module({
  imports: [CandleModule, CandlestickModule, StatusTradingModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
