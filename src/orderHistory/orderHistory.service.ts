import { Injectable } from '@nestjs/common';
import * as ccxt from 'ccxt';

@Injectable()
export class OrderHistoryService {
  private exchange: ccxt.binance;

  constructor() {
    // Khởi tạo Binance API với API key và Secret
    this.exchange = new ccxt.binance({
      apiKey: 'fe3a0df4e1158de142af6a1f75cdb61771f05a21c7e13d7000f6340a65ba1440',
      secret: '77068e56cc0f1c8a7ed58ae2962cc35c896e1c80c7832d6ad0fc7407f850d6fe',
      enableRateLimit: true,
      options: {
        defaultType: 'future', // Chỉ làm việc với Futures
      },
    });
  }

  // Hàm lấy lịch sử lệnh, chỉ lấy 20 phần tử gần nhất
  async getOrderHistory(symbol: string = 'BTC/USDT') {
    try {
      this.exchange.setSandboxMode(true);

      const now = this.exchange.milliseconds();
      const since = now - 24 * 60 * 60 * 1000;
      const trades = await this.exchange.fetchMyTrades(symbol, since); 
      const reversedtrades = trades.reverse();

      return {
        reversedtrades
      };
    } catch (error) {
      throw new Error(`Error fetching order history: ${error.message}`);
    }
  }

  convertMilliseconds(ms: number) {
    const date = new Date(ms);
    return date.toLocaleString();
  }


}