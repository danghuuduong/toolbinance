import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
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
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;

  private binanceWs: WebSocket;
  private reconnectInterval: any;
  private currentInterval: any;

  constructor() {
    this.connectToBinance('1m'); // Khởi tạo kết nối mặc định với 1m
  }

  // Hàm kết nối WebSocket với Binance
  connectToBinance(interval: string) {
    console.log('â', interval);
    this.binanceWs = new WebSocket(
      `wss://stream.binance.com:9443/ws/btcusdt@kline_${interval}`,
    );

    this.binanceWs.on('message', (data: string) => {
      const candlestickData = JSON.parse(data);
      this.handleCandlestickUpdate(candlestickData);
    });

    this.binanceWs.on('error', (err) => {
      console.error('WebSocket error: ', err);
    });

    this.binanceWs.on('close', () => {
      console.log('WebSocket closed');
      this.reconnectWebSocket();
    });

    this.binanceWs.on('ping', (data) => {
      this.binanceWs.pong(data);
    });
  }

  // Hàm tự động reconnect sau khi WebSocket bị đóng
  reconnectWebSocket() {
    console.log('Reconnecting...');
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
    }
    this.reconnectInterval = setInterval(() => {
      this.connectToBinance(this.currentInterval); // Thực hiện reconnect với mặc định interval 1m
    }, 10000);
  }

  // Lắng nghe sự kiện "changeTimeInterval" từ frontend
  @SubscribeMessage('changeTimeInterval')
  handleTimeIntervalChange(client: Socket, interval: string) {
    this.currentInterval = interval;
    // Đóng kết nối cũ và mở kết nối mới với interval được yêu cầu
    if (this.binanceWs) {
      this.binanceWs.close(); // Đóng kết nối WebSocket cũ
    }
    this.connectToBinance(interval); // Tạo kết nối WebSocket mới với interval mới
  }

  // Hàm xử lý dữ liệu nến và gửi cho frontend
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
    };
    this.server.emit('candleStick-RealTime', candlestickInfo);
  }

  handleConnection(client: Socket) {
    console.log('Client connected');
  }

  handleDisconnect(client: Socket) {
    console.log('Client disconnected');
  }
}
