import { Module } from '@nestjs/common';
import { realtimeBTCWebsoketGateway } from './realtimeBTC-websoket.gateway';
import { realtimeBTCWebsoketService } from './realtimeBTC-websoketservice';
import { CandleModule } from 'src/candle/candle.module';
import { CandleService } from 'src/candle/candle.service';

@Module({
  imports: [CandleModule], // Import các module khác vào
  providers: [realtimeBTCWebsoketGateway, realtimeBTCWebsoketService], // realtimeBTCWebsoketGateway được cung cấp trong module này
})
export class  realtimeBTCWebsoketModule{}
