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
import { realtimeBTCWebsoketService } from './realtimeBTC-websoketservice';

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
  private currentInterval: string = '1m'; // Interval mặc định
  private isTrading: boolean = false;
  private totalAmount: number = 0;
  private moneyfodingOne: number = 0;
  private foldingCurrent: number = 0;
  private prices: number[] = []; // Lưu trữ giá đóng cửa của các cây nến

  constructor(
    private readonly startTradingService: startTradingService,
    private readonly realtimeBTCWebsoketService: realtimeBTCWebsoketService
  ) {
    this.connectToBinance(this.currentInterval); 
  }

  async handleSetInfoMoney() {
    try {
      const result = await this.startTradingService.getStatusTrading();
      this.isTrading = result.isTrading;
      this.totalAmount = result.totalAmount;
      this.moneyfodingOne = result.moneyfodingOne;
      this.foldingCurrent = result.foldingCurrent;
    } catch (error) {
      console.error('Error getStatusTrading', error);
    }
  }

  // Hàm kết nối WebSocket
  connectToBinance(interval: string) {
    this.binanceWs = new WebSocket(`wss://stream.binance.com:9443/ws/btcusdt@kline_${interval}`,);
    this.binanceWs.on('message', (data: string) => this.handleCandlestickUpdate(JSON.parse(data)));
    this.binanceWs.on('error', (err) => { console.error('WebSocket error: ', err); });
    this.binanceWs.on('close', () => { console.log(' close'); this.reconnectWebSocket(); });
    this.binanceWs.on('ping', (data) => { console.log(' ping', data); this.binanceWs.pong(data); });
  }

  reconnectWebSocket() { this.connectToBinance(this.currentInterval); }// Hàm tự động reconnect sau khi WebSocket bị đóng

  // Lắng nghe sự kiện "changeTimeInterval" từ frontend
  // @SubscribeMessage('changeTimeInterval')
  // handleTimeIntervalChange(client: Socket, interval: string) {
  //   // Đóng kết nối cũ và mở kết nối mới với interval được yêu cầu
  //   if (this.binanceWs) {
  //     this.binanceWs.close(); // Đóng kết nối WebSocket cũ
  //     this.currentInterval = interval;
  //   }
  // }

  // Hàm xử lý dữ liệu nến và gửi cho frontend
  handleCandlestickUpdate(data: any) {

    const candlestick = data.k;
    const isCandleClose = candlestick.x;
    const E = data.E;
    const date = new Date(E);

    // Lấy giờ, phút, giây và định dạng lại thời gian theo kiểu "00:00:00"
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');

    // In ra thời gian định dạng "00:00:00"
    const timeString = `${hours}:${minutes}:${seconds}`;



    console.log("🚀 ~ time_________",candlestick.i, timeString, isCandleClose)
    isCandleClose && this.realtimeBTCWebsoketService.mainTrading(candlestick);

    const candlestickInfo = {
      openTime: new Date(candlestick.t).toLocaleString(),
      openPrice: candlestick.o,
      closePrice: candlestick.c,
      highPrice: candlestick.h,
      lowPrice: candlestick.l,
      volume: candlestick.v,
      closeTime: new Date(candlestick.T).toLocaleString(),
      type: candlestick.i,
      statusTrading: this.isTrading,
      // emaCrossover: crossoverResult, // Gửi kết quả giao cắt EMA
    };
    this?.server?.emit('candleStick-RealTime', candlestickInfo);
  }


  handleConnection(client: Socket) { console.log('Client connected'); }
  handleDisconnect(client: Socket) { console.log('Client disconnected'); }
}
