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

    this.checkOpenOrders('BTC/USDT', resultSttatusTrading)

    if (resultSttatusTrading?.isActiveExecuteTrade && resultSttatusTrading?.isTrading) {  //nếu mà Đã vào tiền
      // console.log("abc", abc.reversedtrades.slice(0, 3));

      // const isWin = true
      // if (isWin) {
      //   return
      // } else {
      //   return
      // }

    }
    // this.handleStartExecuteTrade("up", resultSttatusTrading, timeBinance)

    if (crossOverResult !== 'no') {
      //   this.handleEmaCrossHistorySave(crossOverResult, resultSttatusTrading, timeBinance)
      //   this.handleStartExecuteTrade(crossOverResult, resultSttatusTrading, timeBinance, currentPrice)
      // this.handleStartExecuteTrade("up", resultSttatusTrading, timeBinance)

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
    if (result?.isActiveExecuteTrade === false && result?.isTrading) {

      const moneyfodingOne = this.handleFoldingService.handleFodingToMoney(result.totalAmount, result.foldingCurrent);
      const LS = crossOverResult === "up" ? "buy" : "sell";

      const symbol = 'BTC/USDT';

      const amount = moneyfodingOne / (1000 * 10);
      await this.exchange.setLeverage(10, symbol);

      const order = await this.exchange.createOrder(symbol, 'market', LS, amount);

      if (order) {
        const currentPrice = parseFloat(order?.info?.avgPrice);
        const takeProfitPrice = parseFloat(`${crossOverResult === "up" ? currentPrice + 1000 : currentPrice - 1000}`);
        const stopLossPrice = parseFloat(`${crossOverResult === "up" ? currentPrice - 1000 : currentPrice + 1000}`);
        const stopLossOrder = await this.exchange.createOrder(symbol, 'market', crossOverResult === "up" ? "sell" : "buy", amount, stopLossPrice, {
          stopLossPrice: stopLossPrice,
          reduceOnly: true,
        });
        const takeProfitOrder = await this.exchange.createOrder(symbol, 'market', crossOverResult === "up" ? "sell" : "buy", amount, takeProfitPrice, {
          takeProfitPrice: takeProfitPrice,
          reduceOnly: true,
        });
        if (stopLossOrder?.info?.orderId && takeProfitOrder?.info?.orderId) {
          const payload = {
            isActiveExecuteTrade: true,
            idOrderMain: order?.info?.orderId,
            idStopLossOrder: stopLossOrder?.info?.orderId,
            idTakeProfitOrder: takeProfitOrder?.info?.orderId,
          }
          result?._id && this.startTradingService.updateTrading(result._id.toString(), payload);
        }
      }

    }
  }

  async checkOpenOrders(symbol: string, resultSttatusTrading) {
    try {

      const openOrders = await this.exchange.fetchOpenOrders(symbol);

      

      // if (openOrders?.length === 0 && !checkPosition) {
      //   resultSttatusTrading?._id && this.startTradingService.updateTrading(resultSttatusTrading._id.toString(), { isActiveExecuteTrade: false });
      // }

      // if (openOrders?.length === 1) {
      //   try {
      //     const result = await this.exchange.cancelOrder(openOrders[0]?.id, symbol);
      //     return result;
      //   } catch (error) {
      //     console.error('Error canceling order:', error);
      //     throw error;
      //   }
      // }
      // if (openOrders?.length === 2 && !checkPosition) {
      //   try {
      //     const result = await this.exchange.cancelOrder(resultSttatusTrading?.idStopLossOrder, symbol);
      //     const result2 = await this.exchange.cancelOrder(resultSttatusTrading?.idTakeProfitOrder, symbol);
      //     return { result, result2 };
      //   } catch (error) {
      //     console.error('Error canceling order:', error);
      //     throw error;
      //   }
      // }

      return openOrders;
    } catch (error) {
      console.error('Failed to fetch open orders:', error);
      throw error;
    }
  }


  async checkPosition(symbol: string, oderLength, isActiveExecuteTrade) {
    try {
      const positions = await this.exchange.fetchPositions([symbol]);
      const position = positions.find((p: any) => p.info.symbol === "BTCUSDT" && p.positionAmt !== '0');
      if (oderLength === 0 && position && isActiveExecuteTrade) {
        const side = position.side === "short" ? 'buy' : 'sell';
        const closeAllPositions = await this.exchange.createMarketOrder(position.symbol, side, Math.abs(parseFloat(position.info.positionAmt)));
        return closeAllPositions
      }

      return position ? true : false
    } catch (error) {
      console.error('Error checking position:', error);
      throw error;
    }
  }


  // -------------------------------------------------------------------------
  async getCurrentBTCPrice(): Promise<number> {
    const ticker = await this.exchange.fetchTicker('BTC/USDT');
    return ticker.last;
  }
}
