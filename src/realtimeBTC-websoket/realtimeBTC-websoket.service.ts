import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CandleService } from 'src/candle/candle.service';
import { Timeframe } from 'src/candle/dto/timeframe.enum';
import { EMA } from 'technicalindicators';
import { EmaCrossHistory } from './schemas/realtimeBTC-websoket.schema';
import { Model } from 'mongoose';
import { CreateEmaCrossHistoryDto } from './dto/create-ema-cross-history.dto';
import { startTradingService } from 'src/start-trading/start-trading.service';
import { handleFoldingService } from 'src/common/until/handleFoldingToMoney/handleFolding.service';

@Injectable()
export class realtimeBTCWebsoketService {
  constructor(
    private readonly candleService: CandleService,
    private readonly startTradingService: startTradingService,
    private readonly handleFoldingService: handleFoldingService,
    @InjectModel(EmaCrossHistory.name) private EmaCrossHistoryModel: Model<EmaCrossHistory>
  ) { }

  private pricesCandleCloseList: number[] = [];
  private emaStatus: { status: string; time: string } = {
    status: 'no',
    time: '',
  };

  async mainTrading(timeBinance: string) {

    try { const candleList = await this.callApiGetCandle(); this.pricesCandleCloseList = candleList.map((value) => value.close); }
    catch (error) { console.error('Error get Api 60 record faild', error); }

    const crossOverResult = this.checkEmaCrossover(this.pricesCandleCloseList) as 'up' | 'down' | 'no';

    this.emaStatus = { status: crossOverResult, time: crossOverResult !== 'no' ? timeBinance : 'null', };
    const { data } = await this.startTradingService.getStartTradingData();
    const resultSttatusTrading = data?.[0]

    // if (resultSttatusTrading?.isActiveExecuteTrade) {  //nếu mà Đã vào tiền
    //   if ("xong rồi") {

    //     // a Update lại API (Lịch sử Chơi)
    //     // b. Post Api isActiveExecuteTradeApi = false

    //     if ("Ăn") {
    //       // 1. foldingCurrent = 1
    //       // 3/ totalAmount = 1400.
    //       if (isWaiingTRading) {
    //         //Cho phép dừng
    //       }
    //     } else ("Thua"){
    //       {
    //         const isFoldingbyMax = "folding" === 5

    //         // 1. foldingCurrent = isFoldingbyMax ? (Trực tiếp bằng  1) : (foldingCurrent + 1)
    //         // 2/ totalAmount = 1400
    //         if (isWaiingTRading && isFoldingbyMax) {
    //           //Cho phép dừng
    //         }
    //       }
    //     }
    //   }
    // }

    if (crossOverResult !== 'no') {
      const { data } = await this.startTradingService.getStartTradingData();
      const resultSttatusTrading = data?.[0]
      // 1. Thực hiện EmaCrossHistorySave
      this.handleEmaCrossHistorySave(crossOverResult, resultSttatusTrading, timeBinance)
      //  -------------------------------------------------------------------------------------------------------
      // 2. Thực hiện giao dịch
      this.handleStartExecuteTrade(crossOverResult, resultSttatusTrading, timeBinance)
    }





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

  // -------------------------------------

  async handleEmaCrossHistorySave(crossOverResult, resultSttatusTrading, timeBinance) {
    const newData: CreateEmaCrossHistoryDto = {
      cross: crossOverResult,
      isTrading: resultSttatusTrading?.isTrading,
      isActiveExecuteTrade: resultSttatusTrading?.isActiveExecuteTrade, //khoan
      isWaitingForCompletion: resultSttatusTrading?.isWaitingForCompletion,
      tradeRate: resultSttatusTrading?.tradeRate,
      totalAmount: resultSttatusTrading?.totalAmount,
      moneyfodingOne: resultSttatusTrading?.moneyfodingOne,
      foldingCurrent: resultSttatusTrading?.foldingCurrent,
      largestMoney: resultSttatusTrading?.largestMoney,
      time: timeBinance,
    };
    console.log('nhảy newData', newData);
    const created = new this.EmaCrossHistoryModel(newData);
    await created.save();
  }

  async handleStartExecuteTrade(crossOverResult, result, timeBinance) {
    if (!result?.isActiveExecuteTradeApi && result?.isTrading) {

      const totalAmount = (Number(result?.largestMoney) / 100) * Number(result?.tradeRate) || 0;
      const moneyfodingOne = this.handleFoldingService.handleFodingToMoney(totalAmount, result?.foldingCurrent);
      if (crossOverResult === "up") { //mua
        // + Viết tiếp hàm tính toán với 1000 giá BTC . làm sao chốt TP và SP đủ 32$

      } else { //bán
        // + Viết tiếp hàm tính toán với 1000 giá BTC . làm sao chốt TP và SP đủ 32$
      }

      //  2.update isActiveExecuteTrade = true
    }
  }
}
