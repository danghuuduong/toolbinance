import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CandleService } from 'src/candle/candle.service';
import { Timeframe } from 'src/candle/dto/timeframe.enum';
import { EMA } from 'technicalindicators';
import { EmaCrossHistory } from './schemas/realtimeBTC-websoket.schema';
import { Model } from 'mongoose';
import { CreateEmaCrossHistoryDto } from './dto/create-ema-cross-history.dto';
import { startTradingService } from 'src/start-trading/start-trading.service';

@Injectable()
export class realtimeBTCWebsoketService {
  constructor(
    private readonly candleService: CandleService,
    private readonly startTradingService: startTradingService,
    @InjectModel(EmaCrossHistory.name) private EmaCrossHistoryModel: Model<EmaCrossHistory>
  ) { }

  private pricesCandleCloseList: number[] = [];
  private emaStatus: { status: string; time: string } = {
    status: 'no',
    time: '',
  };

  async mainTrading(timeBinance: string) {
    const resultSttatusTrading = this.startTradingService.getStatusTrading();

    try { const candleList = await this.callApiGetCandle(); this.pricesCandleCloseList = candleList.map((value) => value.close); }
    catch (error) { console.error('Error get Api 60 record faild', error); }

    const crossOverResult = this.checkEmaCrossover(this.pricesCandleCloseList) as 'up' | 'down' | 'no';

    this.emaStatus = { status: crossOverResult, time: crossOverResult !== 'no' ? timeBinance : 'null', };

    console.log('nhảy', timeBinance);

    //1. Lưu vào Db lịch sử EMA cắt nhau nếu có
    if (crossOverResult !== 'no') {
      console.log('Cắt nhau không ==> ', crossOverResult);
      const newData: CreateEmaCrossHistoryDto = {
        cross: crossOverResult,
        isActiveExecuteTrade: resultSttatusTrading.isTrading, //khoan
        time: timeBinance,
        moneyFoldingOne: resultSttatusTrading.moneyfodingOne || 0,
        foldingCurrent: resultSttatusTrading.foldingCurrent || 0,
      };
      console.log('CnewData', newData);

      const created = new this.EmaCrossHistoryModel(newData);
      await created.save();
    }
    //  -------------------------------------------------------------------------------------------------------
    //2. Thực hiện giao dịch




    return
  }

  checkEmaCrossover(pricesCandleCloseList: number[]): string {
    const ema9 = EMA.calculate({ period: 9, values: pricesCandleCloseList });
    const ema25 = EMA.calculate({ period: 25, values: pricesCandleCloseList });

    if (ema9.length > 1 && ema25.length > 1) {
      const lastEma9 = ema9[ema9.length - 1];
      const lastEma25 = ema25[ema25.length - 1];
      const previousEma9 = ema9[ema9.length - 2];
      const previousEma25 = ema25[ema25.length - 2];
      if (lastEma9 > lastEma25 && previousEma9 <= previousEma25) {
        return "up";
      } else if (lastEma9 < lastEma25 && previousEma9 >= previousEma25) {
        return "down";
      }
    }
    return "no";
  }


  async getAllEmaCrossHistory(param: { page: number; limit: number }) {
    try {
      const skip = param.page * param.limit;
      const result = await this.EmaCrossHistoryModel.find()
        .skip(skip)
        .limit(param.limit)
        .sort({ time: -1 })
        .exec();

      const totalCount = await this.EmaCrossHistoryModel.countDocuments();
      const totalPages = Math.ceil(totalCount / param.limit);
      const currentPage = param.page;

      return {
        status: 'ok',  // Trạng thái yêu cầu thành công
        message: 'Data fetched successfully',  // Thông báo
        totalCount,
        totalPages,
        currentPage,
        data: result,
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message || 'An error occurred while fetching data',
      };
    }
  }

  async callApiGetCandle() {
    return this.candleService.getBTCOLHCandles({
      limit: "60",
      type: Timeframe.ONE_MINUTE,
    })
  }

  getEmaStatus() { return this.emaStatus }
}
