import { Module } from '@nestjs/common';
import { CandlestickGateway } from './candlestick.gateway';
import { candlestickService } from './candlestick.service';

@Module({
  providers: [CandlestickGateway, candlestickService], // CandlestickGateway được cung cấp trong module này
})
export class CandlestickModule { }
