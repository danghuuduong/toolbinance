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
      apiKey: process.env.BINANCE_API_KEY,
      secret: process.env.BINANCE_API_SECRET,
      enableRateLimit: true,
      options: {
        defaultType: 'future',
      },
    });
  }
  private messenger: string = "null";

  async handleBuy(crossOverResult, timeBinance: string, timestamp) {
    const { data } = await this.startTradingService.getStartTradingData();
    const resultSttatusTrading = data?.[0]
    this.handleStartExecuteTrade(crossOverResult, resultSttatusTrading, timeBinance, timestamp)
    return
  }

  async handleCheck(timeBinance: string, timestamp) {
    const { data } = await this.startTradingService.getStartTradingData();
    const resultSttatusTrading = data?.[0]
    this.checkOpenOrders('BTC/USDT', resultSttatusTrading, timeBinance, timestamp)
    return
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
      type: Timeframe.FIFTEEN_MINUTES,
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

  async handleStartExecuteTrade(crossOverResult, result, timeBinance, timestamp) {
    if (!result?.isActiveExecuteTrade && result?.isTrading) {

      const moneyfodingOne = this.handleFoldingService.handleFodingToMoney(result.totalAmount, result.foldingCurrent);
      const LS = crossOverResult === "up" ? "buy" : "sell";

      const symbol = 'BTC/USDT';

      const amount = moneyfodingOne / 1000;
      await this.exchange.setLeverage(10, symbol);

      try {

        const order = await this.exchange.createOrder(symbol, 'market', LS, amount, undefined, {
          timestamp,
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
              timestamp,
            });
            console.log("SL ok", timeBinance);

          } catch (error) {
            console.log("Lỗi SL", error);
          }


          let takeProfitOrder
          try {
            takeProfitOrder = await this.exchange.createOrder(symbol, 'market', crossOverResult === "up" ? "sell" : "buy", amount, takeProfitPrice, {
              takeProfitPrice: takeProfitPrice,
              reduceOnly: true,
              oco: true,
              timestamp,
            });
            console.log(" Tp ok", timeBinance);

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
            console.log("đã oder", amount, "tại thếp", result.foldingCurrent, "số tiền là", moneyfodingOne, " Lúc", timeBinance);

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

  async checkOpenOrders(symbol: string, resultSttatusTrading, timeBinance, timestamp) {
    try {
      let openOrders
      try {
        openOrders = await this.exchange.fetchOpenOrders(symbol, undefined, 4, { timestamp  });
      } catch (error) {
        console.log("Lỗi openOrders", error.message);
      }

      let checkPosition
      try {
        checkPosition = await this.handleCheckPosition(symbol, openOrders?.length, resultSttatusTrading?.isActiveExecuteTrade, timestamp);
      } catch (error) {
        console.log("Lỗi checkPosition", error.message);
      }

      let trade
      try {
         const serverTime = await this.getServerTime();

        trade = await this.exchange.fetchMyTrades(symbol, undefined, 9, { timestamp });
      } catch (error) {
        console.log("Lỗi fetchMyTrades", error.message);
      }

      if (!checkPosition && resultSttatusTrading?.isActiveExecuteTrade && resultSttatusTrading?.isTrading && openOrders?.length === 0) {

        const mainPNL = trade.find((value => value.info.orderId === resultSttatusTrading.idOrderMain))
        const stopLossPNL = trade.find((value => value.info.orderId === resultSttatusTrading.idStopLossOrder))
        const takeProfitPNL = trade.find((value => value.info.orderId === resultSttatusTrading.idTakeProfitOrder))

        const totalPnl = [mainPNL, stopLossPNL, takeProfitPNL].reduce((total, pnl) => total + (Number(pnl?.info?.realizedPnl) || 0), 0);
        const isWin = totalPnl >= 0

        let sodu
        try {
          sodu = await this.MyInfomationService.getMyInfomation()
        } catch (error) {
          console.log("Lỗi getMyInfomation", error.message);
        }

        try {
          const idHistoryMoney = await this.AmountService.findAll()
          this.AmountService.update(idHistoryMoney?.[0]?._id.toString(), {
            history: [`${sodu.USDT.total}`]
          })
        } catch (error) {
          console.log("Lỗi history", error.message);
        }

        if (isWin) {
          const totalAmount = (Number(sodu.USDT.total) / 100) * Number(resultSttatusTrading.tradeRate) || 0;
          console.log("đã win : ", totalPnl, "$ tại thếp", resultSttatusTrading.foldingCurrent, "time", timeBinance);

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
          resultSttatusTrading.isWaitingForCompletion && console.log("đã stop w", timeBinance);
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
          console.log("đã Thua :", totalPnl, "$, tại thếp", resultSttatusTrading.foldingCurrent, "thếp mới", foldingCurrent, "time:", timeBinance);

          if (resultSttatusTrading.isWaitingForCompletion && isFoldingbyMax) {
            console.log("đã stop", timeBinance);
          }

          this.startTradingService.updateTrading(resultSttatusTrading._id.toString(), payload);
        }
      }

      if (openOrders?.length === 1 && !checkPosition) {
        console.log("length 1", timeBinance);
        try {
          const result = await this.exchange.cancelOrder(openOrders[0]?.id, symbol);
          return result;
        } catch (error) {
          console.error('Lỗi length1:', error.message);
        }
      }
      if (openOrders?.length === 2 && !checkPosition) {
        console.log("đã đóng lệnh length 2", timeBinance);

        try {
          const result = await this.exchange.cancelOrder(resultSttatusTrading?.idStopLossOrder, symbol, { timestamp });
          const result2 = await this.exchange.cancelOrder(resultSttatusTrading?.idTakeProfitOrder, symbol, { timestamp });
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


  async handleCheckPosition(symbol: string, oderLength, isActiveExecuteTrade, timestamp) {
    try {
      const positions = await this.exchange.fetchPositions([symbol], { timestamp });

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
  getMessenger() { return this.messenger }
}
