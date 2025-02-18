import { Module } from '@nestjs/common';
import { realtimeBTCWebsoketGateway } from './realtimeBTC-websoket.gateway';
import { realtimeBTCWebsoketService } from './realtimeBTC-websoketservice';
import { CandleModule } from 'src/candle/candle.module';
import { CandleService } from 'src/candle/candle.service';
import { TimeModule } from 'src/common/until/time/time.module';

@Module({
  imports: [CandleModule,TimeModule],
  providers: [realtimeBTCWebsoketGateway, realtimeBTCWebsoketService], // realtimeBTCWebsoketGateway được cung cấp trong module này
})
export class  realtimeBTCWebsoketModule{}
