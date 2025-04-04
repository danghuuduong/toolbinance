import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { startTradingService } from 'src/start-trading/start-trading.service';
import * as WebSocket from 'ws';
import { realtimeBTCWebsoketService } from './realtimeBTC-websoket.service';
import { TimeService } from 'src/common/until/time/time.service';
import * as ccxt from 'ccxt';
import axios from 'axios';
import { Timeframe } from 'src/candle/dto/timeframe.enum';

@WebSocketGateway(3001, {
  cors: {
    origin: 'http://localhost:5173', // Cho phép frontend React kết nối từ localhost:5173
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true, // Nếu cần truyền cookie hoặc dữ liệu xác thực
  },
})

export class realtimeBTCWebsoketGateway
  implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private exchange: ccxt.binance;

  private binanceWs: WebSocket;
  private currentInterval: string = '1m'; // Interval mặc định
  private isEMA = false;
  private huongEMA = "no";
  private timeCrossEma: any = "";

  constructor(
    private readonly realtimeBTCWebsoketService: realtimeBTCWebsoketService,
    private readonly timeService: TimeService,
    private readonly startTradingService: startTradingService,
  ) {
    this.connectToBinance(this.currentInterval);
    this.exchange = new ccxt.binance({
      apiKey: process.env.BINANCE_API_KEY,
      secret: process.env.BINANCE_API_SECRET,
      enableRateLimit: true,
      options: {
        defaultType: 'future',
      },
    });
  }



  async getOpenOrders(symbol: string, timestamp) {
    try {
      const orders = await this.exchange.fetchOpenOrders(symbol, undefined, 4, { timestamp });
      return orders;
    } catch (error) {
      console.error('Error orders:', error);
      return [];
    }
  }

  async getPositions(symbol: string, timestamp) {
    try {
      const positions = await this.exchange.fetchPositions([symbol], { timestamp });
      return positions;
    } catch (error) {
      console.error('Error positions:', error);
      return [];
    }
  }

  // Hàm kết nối WebSocket
  connectToBinance(interval: string) {
    this.binanceWs = new WebSocket(`wss://stream.binance.com:9443/ws/btcusdt@kline_${interval}`,);
    this.binanceWs.on('message', (data: string) => this.handleCandlestickUpdate(JSON.parse(data)));
    this.binanceWs.on('error', (err) => { console.error('WebSocket error: ', err); });
    this.binanceWs.on('close', () => { console.log(' close'); this.reconnectWebSocket(); });
    this.binanceWs.on('ping', (data) => { this.binanceWs.pong(data); });
    this.binanceWs.on('ping', (data) => {
      // console.log(' ping', data);
      this.binanceWs.pong(data);
    });
  }

  reconnectWebSocket() { this.connectToBinance(this.currentInterval); }// Hàm tự động reconnect sau khi WebSocket bị đóng

  @SubscribeMessage('changeTimeInterval')
  handleTimeIntervalChange(client: Socket, interval: string) {
    if (this.binanceWs) {
      this.binanceWs.close();
    }
  }

  async getServerTime() {
    try {
      const response = await axios.get('https://api.binance.com/api/v3/time');
      return response.data.serverTime; // Trả về serverTime từ Binance
    } catch (error) {
      console.error('Không thể lấy thời gian từ máy chủ Binance:', error);
    }
  }

  private calculateEMA(data: number[], period: number): number[] {
    let emaArray: number[] = [];
    let k = 2 / (period + 1); // Hệ số smoothing

    // Tính giá trị EMA đầu tiên (SMA cho giá trị đầu tiên)
    emaArray.push(data.slice(0, period).reduce((acc, val) => acc + val) / period);

    // Tính các giá trị EMA tiếp theo
    for (let i = period; i < data.length; i++) {
      const previousEma = emaArray[emaArray.length - 1];
      const currentPrice = data[i];
      const currentEma = currentPrice * k + previousEma * (1 - k);
      emaArray.push(currentEma);
    }

    return emaArray;
  }

  async getEMACross(symbol: string, timeframe: string, limit: number) {
    try {
      // Lấy dữ liệu nến từ Binance
      const candles = await this.exchange.fetchOHLCV(symbol, timeframe, undefined, limit);

      // Lấy giá đóng cửa của các cây nến
      const closePrices = candles.map((candle) => candle[4]);

      const lastCandle = candles[candles.length - 1];
      const openPrice = lastCandle[1];  // Giá mở cửa của cây nến cuối cùng
      const closePrice = lastCandle[4]; // Giá đóng cửa của cây nến cuối cùng


      // Tính EMA 9 và EMA 25
      const ema9 = this.calculateEMA(closePrices, 9);
      const ema25 = this.calculateEMA(closePrices, 25);

      // Kiểm tra trạng thái cắt nhau của EMA 9 và EMA 25
      const previousEma9 = ema9[ema9.length - 2];
      const previousEma25 = ema25[ema25.length - 2];
      const currentEma9 = ema9[ema9.length - 1];
      const currentEma25 = ema25[ema25.length - 1];

      // Kiểm tra trạng thái cắt nhau của EMA 9 và EMA 25
      let crossStatus = 'no';  // Trạng thái mặc định

      if (previousEma9 < previousEma25 && currentEma9 > currentEma25) {
        crossStatus = 'up';  // EMA 9 cắt EMA 25 từ dưới lên
      } else if (previousEma9 > previousEma25 && currentEma9 < currentEma25) {
        crossStatus = 'down';  // EMA 9 cắt EMA 25 từ trên xuống
      }

      return {
        crossStatus,
        ema9: currentEma9,
        ema25: currentEma25,
        openPrice,
        closePrice
      };
    } catch (error) {
      console.error('Error fetching candles or calculating EMA:', error);
      return
    }
  }

  // Hàm xử lý dữ liệu nến và gửi cho frontend
  async handleCandlestickUpdate(data: any) {
    const candlestick = data.k;
    const isCandleClose = candlestick.x;

    const symbol = 'BTC/USDT';
    const serverTime = await this.getServerTime();
    const openOrders = await this.getOpenOrders(symbol, serverTime);
    const positions = await this.getPositions(symbol, serverTime);
    const timeBinance = this.timeService.formatTimestampToDatetime(data.E)

    if (positions?.length > 0) {

      const givenTimestamp = positions[0]?.timestamp;
      const currentTime = Date.now();
      const fiveMinutesInMillis = 0.5 * 60 * 1000;
      const is1phut = currentTime - givenTimestamp > fiveMinutesInMillis;

      if (is1phut) {
        const currentPrice = parseFloat(positions[0]?.info?.entryPrice);
        const crossOverResult = positions[0]?.side === "long" ? "sell" : " buy"
        const takeProfitPrice = parseFloat(`${positions[0]?.side === "long" ? currentPrice + 1000 : currentPrice - 1000}`);
        const stopLossPrice = parseFloat(`${positions[0]?.side === "long" ? currentPrice - 1000 : currentPrice + 1000}`);
        const amount = positions[0]?.info?.positionAmt

        const isSL = openOrders?.find((value) => value.type === "stop_market")
        const isTP = openOrders?.find((value) => value.type === "take_profit_market")


        let stopLossOrder
        if (!isSL?.info?.orderId) {
          try {
            stopLossOrder = await this.exchange.createOrder(symbol, 'market', crossOverResult, amount, stopLossPrice, {
              stopLossPrice: stopLossPrice,
              reduceOnly: true,
              oco: true,
              timestamp: serverTime,
            });
            console.log("Soket - SL oke", timeBinance);
          } catch (error) {
            console.log("Lỗi SL ở socket", error);
          }
        }

        let takeProfitOrder
        if (!isTP?.info?.orderId) {
          try {
            takeProfitOrder = await this.exchange.createOrder(symbol, 'market', crossOverResult, amount, takeProfitPrice, {
              takeProfitPrice: takeProfitPrice,
              reduceOnly: true,
              oco: true,
              timestamp: serverTime,
            });
            console.log("Soket - TP oke", timeBinance);

          } catch (error) {
            console.log("Lỗi Tp ở socket", error);
          }
        }
        if (stopLossOrder?.info?.orderId) {
          const payload = {
            idStopLossOrder: stopLossOrder?.info?.orderId
          }
          const { data } = await this.startTradingService.getStartTradingData();
          const result = data?.[0]
          result?._id && this.startTradingService.updateTrading(result._id.toString(), payload);
        }

        if (takeProfitOrder?.info?.orderId) {
          const payload = {
            idTakeProfitOrder: takeProfitOrder?.info?.orderI
          }
          const { data } = await this.startTradingService.getStartTradingData();
          const result = data?.[0]
          result?._id && this.startTradingService.updateTrading(result._id.toString(), payload);
        }

      }

    }

    isCandleClose && this.realtimeBTCWebsoketService.handleCheck(timeBinance, serverTime)





    if (positions?.length === 0) {
      const result1h = await this.getEMACross('BTC/USDT', Timeframe.FIFTEEN_MINUTES, 50);
      if (result1h?.crossStatus !== "no" || this.isEMA) {
        const currentTime = new Date().toLocaleTimeString();

        if (this.timeCrossEma === "" && this.huongEMA === "no") {
          this.timeCrossEma = Date.now()
        }
        if (this.timeCrossEma !== "" && this.timeCrossEma && this.isEMA) {
          const currentTime = Date.now();
          const fiveMinutesInMillis = 90 * 60 * 1000;
          const is90phut = currentTime - this.timeCrossEma > fiveMinutesInMillis;
          if (is90phut) {
            this.isEMA = false
            this.huongEMA = "no"
            this.timeCrossEma = ""
          }
        }

        if (this.huongEMA === "no") {
          this.huongEMA = result1h?.crossStatus
        }
        if (this.isEMA === false) {
          this.isEMA = true
        }

        const giabtc = await this.realtimeBTCWebsoketService.getCurrentBTCPrice(serverTime)

        if (this.huongEMA === "up" ? result1h?.openPrice + 200 > giabtc : result1h?.openPrice - 200 < giabtc) {
          console.log("Buy" , currentTime , giabtc , "result1h" , result1h);
          
          this.realtimeBTCWebsoketService.handleBuy(this.huongEMA, timeBinance, serverTime);
          this.isEMA = false
          this.huongEMA = "no"
          this.timeCrossEma = ""
        }
      }

    }


    const candlestickInfo = {
      openTime: new Date(candlestick.t).toLocaleString(),
      openPrice: candlestick.o,
      closePrice: candlestick.c,
      highPrice: candlestick.h,
      lowPrice: candlestick.l,
      volume: candlestick.v,
      closeTime: new Date(candlestick.T).toLocaleString(),
      type: candlestick.i,
      statusTrading: true,
      timeBinance: timeBinance,
      messenger: this.realtimeBTCWebsoketService.getMessenger(),
      positions,
      openOrders
    };
    this?.server?.emit('candleStick-RealTime', candlestickInfo);
  }


  handleConnection(client: Socket) { }
  handleDisconnect(client: Socket) { }
}
