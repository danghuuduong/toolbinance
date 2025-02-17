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

@WebSocketGateway(3001, {
  cors: {
    origin: 'http://localhost:5173', // Cho phép frontend React kết nối từ localhost:5173
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true, // Nếu cần truyền cookie hoặc dữ liệu xác thực
  },
})
export class CandlestickGateway
  implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private binanceWs: WebSocket;
  private currentInterval: any;
  private isTrading: boolean = false;
  private totalAmount: number = 0;
  private moneyfodingOne: number = 0;
  private foldingCurrent: number = 0;

  constructor(private readonly startTradingService: startTradingService) {
    this.connectToBinance('1h'); // Khởi tạo kết nối mặc định với 1m
    this.handleSetInfoMoney();
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

  // Hàm kết nối WebSocket với Binance
  connectToBinance(interval: string) {
    console.log('interval', interval); //1

    this.binanceWs = new WebSocket(
      `wss://stream.binance.com:9443/ws/btcusdt@kline_${interval}`,
    );

    this.binanceWs.on('message', (data: string) => {
      const candlestickData = JSON.parse(data);
      this.handleCandlestickUpdate(candlestickData);
      this.mainTrading(candlestickData);
    });

    this.binanceWs.on('error', (err) => {
      console.error('WebSocket error: ', err);
    });

    this.binanceWs.on('close', () => {
      this.reconnectWebSocket();
    });

    this.binanceWs.on('ping', (data) => {
      console.log(' ping', data);
      this.binanceWs.pong(data);
    });
  }

  // Hàm tự động reconnect sau khi WebSocket bị đóng
  reconnectWebSocket() {
    console.log('Reconnecting...', this.currentInterval);
    this.connectToBinance(this.currentInterval);
  }

  // Lắng nghe sự kiện "changeTimeInterval" từ frontend
  @SubscribeMessage('changeTimeInterval')
  handleTimeIntervalChange(client: Socket, interval: string) {
    // Đóng kết nối cũ và mở kết nối mới với interval được yêu cầu
    if (this.binanceWs) {
      this.binanceWs.close(); // Đóng kết nối WebSocket cũ
      this.currentInterval = interval;
    }
  }

  // Dữ liệu nến và gửi cho frontend
  handleCandlestickUpdate(data: any) {
    const candlestick = data.k;

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
    };
    this?.server?.emit('candleStick-RealTime', candlestickInfo);
  }

  mainTrading(candle: any) {
    const candlestick = candle.k;

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
    };
    console.log('🚀 candlestick.c', candlestick.c);
  }

  handleConnection(client: Socket) {
    console.log('Client connected');
  }

  handleDisconnect(client: Socket) {
    console.log('Client disconnected');
  }
}
