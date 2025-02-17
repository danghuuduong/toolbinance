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
  private currentInterval: any;
  private isTrading: boolean = false;
  private totalAmount: number = 0;
  private moneyfodingOne: number = 0;
  private foldingCurrent: number = 0;
  private prices: number[] = []; // Lưu trữ giá đóng cửa của các cây nến

  constructor(private readonly startTradingService: startTradingService) {
    this.connectToBinance('1h'); // Khởi tạo kết nối mặc định với 1h
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

    // Nếu cây nến đã đóng (tức là cây nến hoàn thành)
    if (candlestick.x) {
      // Lấy giá đóng của cây nến
      const closePrice = parseFloat(candlestick.c);

      // Lưu giá đóng cửa của cây nến vào mảng
      this.prices.push(closePrice);

      // Giới hạn số lượng giá trong 1 giờ (tối đa 60 cây nến)
      if (this.prices.length > 60) {
        this.prices.shift(); // Xóa cây nến cũ nhất (đầu tiên trong mảng)
      }

      // In ra thời gian cây nến (giờ và phút)
      const openTime = new Date(candlestick.t);
      const hour = openTime.getHours();
      const minute = openTime.getMinutes();
      console.log(
        `Cây nến bắt đầu vào lúc: ${openTime.toLocaleString()} (${hour}:${minute})`,
      );

      // Tính toán EMA 9 và EMA 25
      const ema9 = EMA.calculate({ period: 9, values: this.prices });
      const ema25 = EMA.calculate({ period: 25, values: this.prices });

      // Kiểm tra giao cắt EMA
      const crossoverResult = this.checkEmaCrossover(ema9, ema25);

      // Gửi thông tin cây nến và kết quả giao cắt EMA về frontend
      const candlestickInfo = {
        openTime: openTime.toLocaleString(),
        openPrice: candlestick.o,
        closePrice: closePrice,
        highPrice: candlestick.h,
        lowPrice: candlestick.l,
        volume: candlestick.v,
        closeTime: new Date(candlestick.T).toLocaleString(),
        type: candlestick.i,
        statusTrading: this.isTrading,
        emaCrossover: crossoverResult, // Gửi kết quả giao cắt EMA
      };

      this?.server?.emit('candleStick-RealTime', candlestickInfo);
    }
  }

  // Kiểm tra giao cắt EMA 9 và EMA 25
  checkEmaCrossover(ema9: number[], ema25: number[]): string {
    if (ema9.length > 1 && ema25.length > 1) {
      const lastEma9 = ema9[ema9.length - 1];
      const lastEma25 = ema25[ema25.length - 1];
      const previousEma9 = ema9[ema9.length - 2];
      const previousEma25 = ema25[ema25.length - 2];

      if (lastEma9 > lastEma25 && previousEma9 <= previousEma25) {
        return 'EMA Từ dưới lên (bullish crossover)';
      } else if (lastEma9 < lastEma25 && previousEma9 >= previousEma25) {
        return 'EMA Từ trên xuống (bearish crossover)';
      }
    }
    return 'Không có giao cắt';
  }

  handleConnection(client: Socket) {
    console.log('Client connected');
  }

  handleDisconnect(client: Socket) {
    console.log('Client disconnected');
  }
}
