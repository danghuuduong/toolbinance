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
import * as ccxt from 'ccxt';

@Injectable()
export class realtimeBTCWebsoketService {
  private exchange: ccxt.binance;

  constructor(
    private readonly candleService: CandleService,
    private readonly startTradingService: startTradingService,
    private readonly handleFoldingService: handleFoldingService,
    @InjectModel(EmaCrossHistory.name) private EmaCrossHistoryModel: Model<EmaCrossHistory>
  ) {
    this.exchange = new ccxt.binance({
      apiKey:
        'fe3a0df4e1158de142af6a1f75cdb61771f05a21c7e13d7000f6340a65ba1440',
      secret:
        '77068e56cc0f1c8a7ed58ae2962cc35c896e1c80c7832d6ad0fc7407f850d6fe',
      enableRateLimit: true,
      options: {
        defaultType: 'future',
      },
    });
    this.exchange.setSandboxMode(true);
  }



  private pricesCandleCloseList: number[] = [];
  private emaStatus: { status: string; time: string } = {
    status: 'no',
    time: '',
  };

  async mainTrading(timeBinance: string, currentPrice) {

    try { const candleList = await this.callApiGetCandle(); this.pricesCandleCloseList = candleList.map((value) => value.close); }
    catch (error) { console.error('Error get Api 60 record faild', error); }

    const crossOverResult = this.checkEmaCrossover(this.pricesCandleCloseList) as 'up' | 'down' | 'no';

    this.emaStatus = { status: crossOverResult, time: crossOverResult !== 'no' ? timeBinance : 'null', };
    const { data } = await this.startTradingService.getStartTradingData();
    const resultSttatusTrading = data?.[0]
    // this.checkOpenOrders('BTC/USDT')
    // if (resultSttatusTrading?.isActiveExecuteTrade && resultSttatusTrading?.isTrading) {  //nếu mà Đã vào tiền
    //   console.log("3")

    //   // if ("xong rồi") {

    //   //   // a Update lại API (Lịch sử Chơi)
    //   //   // b. Post Api isActiveExecuteTrade = false

    //   //   if ("Ăn") {
    //   //     // 1. foldingCurrent = 1
    //   //     // 3/ totalAmount = 1400.
    //   //     if (isWaiingTRading) {
    //   //       //Cho phép dừng
    //   //     }
    //   //   } else ("Thua"){
    //   //     {
    //   //       const isFoldingbyMax = "folding" === 5

    //   //       // 1. foldingCurrent = isFoldingbyMax ? (Trực tiếp bằng  1) : (foldingCurrent + 1)
    //   //       // 2/ totalAmount = 1400
    //   //       if (isWaiingTRading && isFoldingbyMax) {
    //   //         //Cho phép dừng
    //   //       }
    //   //     }
    //   //   }
    //   // }
    // }
    this.handleStartExecuteTrade("up", resultSttatusTrading, timeBinance)
    console.log("resultSttatusTrading", resultSttatusTrading);

    // if (crossOverResult !== 'no') {
    //   this.handleEmaCrossHistorySave(crossOverResult, resultSttatusTrading, timeBinance)
    //   this.handleStartExecuteTrade(crossOverResult, resultSttatusTrading, timeBinance, currentPrice)
    // }
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
    if (result?.isActiveExecuteTrade === false && result?.isTrading) {

      const moneyfodingOne = this.handleFoldingService.handleFodingToMoney(result.totalAmount, result.foldingCurrent);
      const LS = crossOverResult === "up" ? "buy" : "sell";

      const symbol = 'BTC/USDT';

      // Số lượng BTC cần mua
      const amount = moneyfodingOne / (1000 * 10);
      await this.exchange.setLeverage(10, symbol);

      // Create a market order
      const order = await this.exchange.createOrder(symbol, 'market', LS, amount);
      // resultSttatusTrading {
      //   _id: new ObjectId('67bbf390306dfb66a4ba435e'),
      //   isTrading: true,
      //   foldingCurrent: 1,
      //   largestMoney: 14638.32735398,
      //   totalAmount: 4391.498206194,
      //   moneyfodingOne: 96.612960536268,
      //   isActiveExecuteTrade: false,
      //   isWaitingForCompletion: false,
      //   tradeRate: 30,
      //   __v: 0
      // }
      // 14426

      // Khối lượng muốn : 96.612960536268
      // kích thước : 756.60 USDT
      // phí 0.30278699 / 756.60 USDT * 100 = 0.04%p
      // 
      if (order) {
        const currentPrice = parseFloat(order?.info?.avgPrice);
        const takeProfitPrice = parseFloat(`${crossOverResult === "up" ? currentPrice + 1000 : currentPrice - 1000}`);
        const stopLossPrice = parseFloat(`${crossOverResult === "up" ? currentPrice - 1000 : currentPrice + 1000}`);
        const stopLossOrder = await this.exchange.createOrder(symbol, 'market', crossOverResult === "up" ? "sell" : "buy", amount, stopLossPrice, {
          stopLossPrice: stopLossPrice,  // Adjust according to exchange API for stop loss
          reduceOnly: true,
        });
        const takeProfitOrder = await this.exchange.createOrder(symbol, 'market', crossOverResult === "up" ? "sell" : "buy", amount, takeProfitPrice, {
          takeProfitPrice: takeProfitPrice,  // Adjust according to exchange API for take profit
          reduceOnly: true,
        });
        if (stopLossOrder?.info?.orderId && takeProfitOrder?.info?.orderId) {
          result?._id && this.startTradingService.updateTrading(result._id.toString(), { isActiveExecuteTrade: true });
        }
      }

    }
  }

  async checkOpenOrders(symbol: string) {
    try {
      // Lấy danh sách các lệnh đang mở cho cặp giao dịch cụ thể
      const openOrders = await this.exchange.fetchOpenOrders(symbol);

      // Sử dụng thời gian từ server để tính toán timestamp chính xác
      // Kiểm tra nếu không có lệnh nào đang mở
      if (openOrders.length === 0) {
        console.log('Không có lệnh nào đang mở');
      } else {
        console.log('Danh sách các lệnh đang mở:', openOrders);
        // openOrders.forEach(order => {
        //   console.log("Order ID:", order.id);
        //   console.log("Order Status:", order.status); // 'open', 'closed', 'canceled'
        //   console.log("Order Filled:", order.filled); // Số lượng đã khớp
        //   console.log("Order Remaining:", order.remaining); // Số lượng còn lại
        //   console.log("Order Price:", order.price); // Giá
        //   console.log("Order Side:", order.side); // 'buy' hoặc 'sell'
        //   console.log("Order Type:", order.type); // 'market', 'limit', 'stop', v.v.
        //   console.log("-----------------------------------");
        // });
      }

      return openOrders; // Trả về danh sách các lệnh đang mở
    } catch (error) {
      console.error('Failed to fetch open orders:', error);
      throw error;
    }
  }


  // -------------------------------------------------------------------------
  async getCurrentBTCPrice(): Promise<number> {
    const ticker = await this.exchange.fetchTicker('BTC/USDT');
    return ticker.last;
  }
}
