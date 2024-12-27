import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CandleModule } from './candle/candle.module';

@Module({
  imports: [CandleModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
