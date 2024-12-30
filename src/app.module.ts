import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CandleModule } from './candle/candle.module';
import { CandlestickModule } from './realtimeBTC/candlestick.module';
@Module({
  imports: [CandleModule, CandlestickModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
