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

  private binanceWs: WebSocket;
  private currentInterval: string = '15m'; // Interval mặc định
  private isTrading: boolean = false;
  private totalAmount: number = 0;
  private moneyfodingOne: number = 0;
  private foldingCurrent: number = 0;
  private prices: number[] = [];

  constructor(
    private readonly startTradingService: startTradingService,
    private readonly realtimeBTCWebsoketService: realtimeBTCWebsoketService,
    private readonly timeService: TimeService
  ) {
    this.connectToBinance(this.currentInterval);
    // this.handleSetInfoMoney();
  }

  //  handleSetInfoMoney() {
  //   try {
  //     const result = this.startTradingService.getStatusTrading();
  //     this.isTrading = result.isTrading;
  //     this.totalAmount = result.totalAmount;
  //     this.moneyfodingOne = result.moneyfodingOne;
  //     this.foldingCurrent = result.foldingCurrent;
  //   } catch (error) {
  //     console.error('Error getStatusTrading', error);
  //   }
  // }

  // Hàm kết nối WebSocket
  connectToBinance(interval: string) {
    this.binanceWs = new WebSocket(`wss://stream.binance.com:9443/ws/btcusdt@kline_${interval}`,);
    this.binanceWs.on('message', (data: string) => this.handleCandlestickUpdate(JSON.parse(data)));
    this.binanceWs.on('error', (err) => { console.error('WebSocket error: ', err); });
    this.binanceWs.on('close', () => { console.log(' close'); this.reconnectWebSocket(); });
    this.binanceWs.on('ping', (data) => { this.binanceWs.pong(data); });
    // this.binanceWs.on('ping', (data) => { console.log(' ping', data); this.binanceWs.pong(data); });
  }

  reconnectWebSocket() { this.connectToBinance(this.currentInterval); }// Hàm tự động reconnect sau khi WebSocket bị đóng

  @SubscribeMessage('changeTimeInterval')
  handleTimeIntervalChange(client: Socket, interval: string) {
    if (this.binanceWs) {
      this.binanceWs.close();
    }
  }

  // Hàm xử lý dữ liệu nến và gửi cho frontend
  handleCandlestickUpdate(data: any) {

    const candlestick = data.k;
    const isCandleClose = candlestick.x;

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
      isWaitingForCompletionStatus: this.realtimeBTCWebsoketService.getIsWaitingForCompletionStatus(),
      
    };
    this?.server?.emit('candleStick-RealTime', candlestickInfo);
  }


  handleConnection(client: Socket) {  }
  handleDisconnect(client: Socket) {  }
}
