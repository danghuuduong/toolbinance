import { Module } from '@nestjs/common';
import { realtimeBTCWebsoketGateway } from './realtimeBTC-websoket.gateway';
import { realtimeBTCWebsoketService } from './realtimeBTC-websoket.service';
import { CandleModule } from 'src/candle/candle.module';
import { CandleService } from 'src/candle/candle.service';
import { TimeModule } from 'src/common/until/time/time.module';
import { MongooseModule } from '@nestjs/mongoose';
import { EmaCrossHistory, EmaCrossHistoryschema, } from './schemas/realtimeBTC-websoket.schema';
import { emaCrossHistoryController } from './realtimeBTC-websoket.controller';
import { handleFoldingService } from 'src/common/until/handleFoldingToMoney/handleFolding.service';
import { StatusTradingModule } from 'src/start-trading/start-trading.module';
import { AmountModule } from 'src/money-history-changes/amount.module';

@Module({
  imports: [CandleModule, TimeModule, StatusTradingModule, AmountModule, MongooseModule.forFeature([{ name: EmaCrossHistory.name, schema: EmaCrossHistoryschema }])],
  controllers: [emaCrossHistoryController],
  providers: [realtimeBTCWebsoketGateway, realtimeBTCWebsoketService, handleFoldingService],
})
export class realtimeBTCWebsoketModule { }
