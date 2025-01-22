import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CandleModule } from './candleVolum/candle.module';
import { CandlestickModule } from './realtimeBTC/candlestick.module';
import { StatusTradingModule } from './status-trading/status-trading.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from './users/users.module';
import { MyInfomationModule } from './my-infomation/my-infomation.module';

@Module({
  imports: [
    CandleModule,
    CandlestickModule,
    StatusTradingModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),

    ConfigModule.forRoot({
      isGlobal: true,
    }),

    UsersModule,

    MyInfomationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
