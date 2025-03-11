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
import { MyInfomationService } from 'src/my-infomation-from-binance/my-infomation.service';
import { AmountService } from 'src/money-history-changes/amount.service';
import axios from 'axios';

@Injectable()
export class realtimeBTCWebsoketService {
  private exchange: ccxt.binance;

  constructor(
    private readonly candleService: CandleService,
    private readonly startTradingService: startTradingService,
    private readonly handleFoldingService: handleFoldingService,
    private readonly MyInfomationService: MyInfomationService,
    private readonly AmountService: AmountService,

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
  private messenger: string = "null";

  private pricesCandleCloseList: number[] = [];
  private emaStatus: { status: string; time: string } = {
    status: 'no',
    time: '',
  };

  async mainTrading(timeBinance: string, currentPrice) {
    try {
      const candleList = await this.callApiGetCandle();
      this.pricesCandleCloseList = candleList.map((value) => value.close);
    }
    catch (error) {
      console.error('Error get Api 60 record faild', error);
    }

    const crossOverResult = this.checkEmaCrossover(this.pricesCandleCloseList) as 'up' | 'down' | 'no';

    this.emaStatus = { status: crossOverResult, time: crossOverResult !== 'no' ? timeBinance : 'null', };
    const { data } = await this.startTradingService.getStartTradingData();
    const resultSttatusTrading = data?.[0]

    this.checkOpenOrders('BTC/USDT', resultSttatusTrading)
    
    this.handleStartExecuteTrade("up", resultSttatusTrading, timeBinance)

    if (crossOverResult !== 'no') {
      // this.handleStartExecuteTrade(crossOverResult, resultSttatusTrading, timeBinance)
      this.handleEmaCrossHistorySave(crossOverResult, resultSttatusTrading, timeBinance)
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
    const created = new this.EmaCrossHistoryModel(newData);
    await created.save();
  }

  async handleStartExecuteTrade(crossOverResult, result, timeBinance) {
    if (!result?.isActiveExecuteTrade && result?.isTrading) {

      const moneyfodingOne = this.handleFoldingService.handleFodingToMoney(result.totalAmount, result.foldingCurrent);
      const LS = crossOverResult === "up" ? "buy" : "sell";

      const symbol = 'BTC/USDT';

      const amount = moneyfodingOne / 1000;
      await this.exchange.setLeverage(10, symbol);

      try {
        const serverTime = await this.getServerTime();

        const order = await this.exchange.createOrder(symbol, 'market', LS, amount, undefined, {
          timestamp: serverTime,
        });

        if (order) {
          const currentPrice = parseFloat(order?.info?.avgPrice);
          const takeProfitPrice = parseFloat(`${crossOverResult === "up" ? currentPrice + 1000 : currentPrice - 1000}`);
          const stopLossPrice = parseFloat(`${crossOverResult === "up" ? currentPrice - 1000 : currentPrice + 1000}`);

          let stopLossOrder
          try {
            stopLossOrder = await this.exchange.createOrder(symbol, 'market', crossOverResult === "up" ? "sell" : "buy", amount, stopLossPrice, {
              stopLossPrice: stopLossPrice,
              reduceOnly: true,
              oco: true,
              timestamp: serverTime,
            });
          } catch (error) {
            console.log("Lỗi SL", error);
          }


          let takeProfitOrder
          try {
            takeProfitOrder = await this.exchange.createOrder(symbol, 'market', crossOverResult === "up" ? "sell" : "buy", amount, takeProfitPrice, {
              takeProfitPrice: takeProfitPrice,
              reduceOnly: true,
              oco: true,
              timestamp: serverTime,
            });
          } catch (error) {
            console.log("Lỗi Tp", error);
          }


          //--------------------------------------------------------------------------------------------------------------------
          if (order?.info?.orderId) {
            const payload = {
              isActiveExecuteTrade: true,
              idOrderMain: order?.info?.orderId,
              idStopLossOrder: stopLossOrder?.info?.orderId || "null",
              idTakeProfitOrder: takeProfitOrder?.info?.orderId || "null",
              ActiveExecuteTrade: timeBinance
            }
            console.log("đã oder", amount, "tại thếp", result.foldingCurrent, "số tiền là", moneyfodingOne);

            result?._id && this.startTradingService.updateTrading(result._id.toString(), payload);
          }
        }

      } catch (error) {
        console.log("error ====", error.message);
        this.messenger = error.message
        return
      }

    }
  }

  async checkOpenOrders(symbol: string, resultSttatusTrading) {
    try {
      let openOrders
      try {
        openOrders = await this.exchange.fetchOpenOrders(symbol);
      } catch (error) {
        console.log("Lỗi openOrders", error.message);
      }

      let checkPosition
      try {
        checkPosition = await this.handleCheckPosition(symbol, openOrders.length, resultSttatusTrading?.isActiveExecuteTrade);
      } catch (error) {
        console.log("Lỗi openOrders", error.message);
      }

      let trade
      try {
        trade = await this.exchange.fetchMyTrades(symbol, undefined, 9);
      } catch (error) {
        console.log("Lỗi openOrders", error.message);
      }

      if (!checkPosition && resultSttatusTrading?.isActiveExecuteTrade && resultSttatusTrading?.isTrading && openOrders.length === 0) {

        const mainPNL = trade.find((value => value.info.orderId === resultSttatusTrading.idOrderMain))
        const stopLossPNL = trade.find((value => value.info.orderId === resultSttatusTrading.idStopLossOrder))
        const takeProfitPNL = trade.find((value => value.info.orderId === resultSttatusTrading.idTakeProfitOrder))

        const totalPnl = [mainPNL, stopLossPNL, takeProfitPNL].reduce((total, pnl) => total + (Number(pnl?.info?.realizedPnl) || 0), 0);
        const isWin = totalPnl >= 0

        let sodu
        try {
          sodu = await this.MyInfomationService.getMyInfomation()
        } catch (error) {
          console.log("Lỗi openOrders", error.message);
        }

        try {
          const idHistoryMoney = await this.AmountService.findAll()
          this.AmountService.update(idHistoryMoney?.[0]?._id.toString(), {
            history: [`${sodu.USDT.total}`]
          })
        } catch (error) {
          console.log("Lỗi openOrders", error.message);
        }

        if (isWin) {
          const totalAmount = (Number(sodu.USDT.total) / 100) * Number(resultSttatusTrading.tradeRate) || 0;
          console.log("đã win : ", totalPnl, "$ tại thếp", resultSttatusTrading.foldingCurrent);

          const moneyfodingOne = this.handleFoldingService.handleFodingToMoney(totalAmount, resultSttatusTrading.foldingCurrent);
          const payload = {
            isActiveExecuteTrade: false,
            foldingCurrent: 1,
            idOrderMain: "null",
            idStopLossOrder: "null",
            idTakeProfitOrder: "null",
            moneyfodingOne,
            totalAmount,
            ...sodu.USDT.total > resultSttatusTrading.largestMoney && { largestMoney: `${sodu.USDT.total}` },
            ...resultSttatusTrading.isWaitingForCompletion && { isTrading: false, isWaitingForCompletion: false }
          }
          resultSttatusTrading.isWaitingForCompletion && console.log("đã stop");
          this.startTradingService.updateTrading(resultSttatusTrading._id.toString(), payload);
        } else {
          const isFoldingbyMax = resultSttatusTrading.foldingCurrent === 5
          const totalAmount = (Number(sodu.USDT.total) / 100) * Number(resultSttatusTrading.tradeRate) || 0;
          const foldingCurrent = isFoldingbyMax ? 1 : (resultSttatusTrading.foldingCurrent + 1);
          const moneyfodingOne = this.handleFoldingService.handleFodingToMoney(totalAmount, foldingCurrent);

          const payload = {
            isActiveExecuteTrade: false,
            foldingCurrent,
            totalAmount,
            moneyfodingOne,
            idOrderMain: "null",
            idStopLossOrder: "null",
            idTakeProfitOrder: "null",
            ...(resultSttatusTrading.isWaitingForCompletion && isFoldingbyMax) && { isTrading: false, isWaitingForCompletion: false }
          }
          console.log("đã Thua :", totalPnl, "$, tại thếp", resultSttatusTrading.foldingCurrent, "thếp mới", foldingCurrent);

          if (resultSttatusTrading.isWaitingForCompletion && isFoldingbyMax) {
            console.log("đã stop");
          }

          this.startTradingService.updateTrading(resultSttatusTrading._id.toString(), payload);
        }
      }

      if (openOrders?.length === 1 && !checkPosition) {
        console.log("length 1");
        try {
          const result = await this.exchange.cancelOrder(openOrders[0]?.id, symbol);
          return result;
        } catch (error) {
          console.error('Lỗi length1:', error.message);
        }
      }
      if (openOrders?.length === 2 && !checkPosition) {
        console.log("đã đóng lệnh length 2");

        try {
          const result = await this.exchange.cancelOrder(resultSttatusTrading?.idStopLossOrder, symbol);
          const result2 = await this.exchange.cancelOrder(resultSttatusTrading?.idTakeProfitOrder, symbol);
          return { result, result2 };
        } catch (error) {
          console.error('Lỗi length2:', error.message);
        }
      }

      return openOrders;
    } catch (error) {
      console.error('Failed to fetch open orders:', error);
    }
  }


  async handleCheckPosition(symbol: string, oderLength, isActiveExecuteTrade) {
    try {
      const positions = await this.exchange.fetchPositions([symbol]);

      const position = positions.find((p: any) => p.info.symbol === "BTCUSDT" && p.positionAmt !== '0');
      if (oderLength === 0 && position && isActiveExecuteTrade) {
        const side = position.side === "short" ? 'buy' : 'sell';
        let closeAllPositions
        try {
          closeAllPositions = await this.exchange.createMarketOrder(position.symbol, side, Math.abs(parseFloat(position.info.positionAmt)));
          console.log("đã đóng lệnh Vị thế");
        } catch (error) {
          console.log("Lỗi đóng lệnh Vị thế ");
        }
        return closeAllPositions
      }
      return position ? true : false
    } catch (error) {
      console.error('Error checking position:', error);
    }
  }

  // -------------------------------------------------------------------------
  async getCurrentBTCPrice(): Promise<number> {
    const ticker = await this.exchange.fetchTicker('BTC/USDT');
    return ticker.last;
  }

  async getServerTime() {
    try {
      const response = await axios.get('https://api.binance.com/api/v3/time');
      return response.data.serverTime; // Trả về serverTime từ Binance
    } catch (error) {
      console.error('Không thể lấy thời gian từ máy chủ Binance:', error);
    }
  }

  getEmaStatus() { return this.emaStatus }
  getMessenger() { return this.messenger }
}
