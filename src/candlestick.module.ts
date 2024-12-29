import { Module } from '@nestjs/common';
import { CandlestickGateway } from './candlestick.gateway';

@Module({
  providers: [CandlestickGateway],  // CandlestickGateway được cung cấp trong module này
})
export class CandlestickModule {}
