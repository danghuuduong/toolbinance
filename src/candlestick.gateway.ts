import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as WebSocket from 'ws';
@WebSocketGateway(3001, {  // Cổng WebSocket của backend
  cors: {
    origin: 'http://localhost:5173',  // Cho phép frontend React kết nối từ localhost:5173
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true,  // Nếu cần truyền cookie hoặc dữ liệu xác thực
  },
})
export class CandlestickGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;  // Đối tượng WebSocket Server để gửi dữ liệu cho frontend

  private binanceWs: WebSocket;  // WebSocket kết nối đến Binance

  constructor() {
    // Khởi tạo WebSocket kết nối với Binance (kline_1m là nến 1 phút)
    this.binanceWs = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@kline_1m');
    
    // Lắng nghe dữ liệu từ WebSocket của Binance
    this.binanceWs.on('message', (data: string) => {
      const candlestickData = JSON.parse(data);  // Dữ liệu nhận được từ WebSocket
      this.handleCandlestickUpdate(candlestickData);  // Xử lý dữ liệu nến
    });

    this.binanceWs.on('error', (err) => {
      console.error('WebSocket error: ', err);
    });
  }

  handleConnection(client: Socket) {
    console.log('Client connected');
  }

  handleDisconnect(client: Socket) {
    console.log('Client disconnected');
  }

  // Hàm xử lý dữ liệu nến và gửi cho frontend
  handleCandlestickUpdate(data: any) {
    const candlestick = data.k;  // Extract dữ liệu từ Binance

    const candlestickInfo = {
      openTime: new Date(candlestick.t).toLocaleString(),  // Thời gian mở nến
      openPrice: candlestick.o,  // Giá mở cửa
      closePrice: candlestick.c,  // Giá đóng cửa
      highPrice: candlestick.h,  // Giá cao nhất
      lowPrice: candlestick.l,  // Giá thấp nhất
      volume: candlestick.v,     // Khối lượng
    };

    // Gửi dữ liệu này tới tất cả client đã kết nối
    this.server.emit('candlestick', candlestickInfo);
  }
}
