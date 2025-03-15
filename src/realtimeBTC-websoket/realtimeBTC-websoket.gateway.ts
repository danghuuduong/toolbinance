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
import { EMA } from 'technicalindicators';
import { realtimeBTCWebsoketService } from './realtimeBTC-websoket.service';
import { TimeService } from 'src/common/until/time/time.service';
import * as ccxt from 'ccxt';
import axios from 'axios';
import { handleFoldingService } from 'src/common/until/handleFoldingToMoney/handleFolding.service';

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
  private currentInterval: string = '15m'; // Interval mặc định
  constructor(
    private readonly realtimeBTCWebsoketService: realtimeBTCWebsoketService,
    private readonly timeService: TimeService,
    private readonly startTradingService: startTradingService,
    private readonly handleFoldingService: handleFoldingService,


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


  async getOpenOrders(symbol: string) {
    try {
      const orders = await this.exchange.fetchOpenOrders(symbol);
      return orders;
    } catch (error) {
      console.error('Error orders:', error);
      return [];
    }
  }

  async getPositions(symbol: string) {
    try {
      const positions = await this.exchange.fetchPositions([symbol]);
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

  // Hàm xử lý dữ liệu nến và gửi cho frontend
  async handleCandlestickUpdate(data: any) {
    const candlestick = data.k;
    const isCandleClose = candlestick.x;

    const symbol = 'BTC/USDT';
    const openOrders = await this.getOpenOrders(symbol);
    const positions = await this.getPositions(symbol);
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
        const serverTime = await this.getServerTime();
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

    isCandleClose && this.realtimeBTCWebsoketService.mainTrading(timeBinance, candlestick.c);

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
      emaCrossOverStatus: this.realtimeBTCWebsoketService.getEmaStatus(),
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
