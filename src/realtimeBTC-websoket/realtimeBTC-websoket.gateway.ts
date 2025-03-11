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
  constructor(
    private readonly realtimeBTCWebsoketService: realtimeBTCWebsoketService,
    private readonly timeService: TimeService


  ) {
    this.connectToBinance(this.currentInterval);
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

  // Hàm xử lý dữ liệu nến và gửi cho frontend
  async handleCandlestickUpdate(data: any) {

    const candlestick = data.k;
    const isCandleClose = candlestick.x;

    const symbol = 'BTC/USDT';
    const openOrders = await this.getOpenOrders(symbol);
    const positions = await this.getPositions(symbol);
    // if (openOrders.length > 0) {
    //   console.log("openOrders", openOrders);
    // }



    const timeBinance = this.timeService.formatTimestampToDatetime(data.E)
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
