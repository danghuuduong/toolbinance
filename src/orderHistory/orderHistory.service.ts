import { Injectable } from '@nestjs/common';
import * as ccxt from 'ccxt';

@Injectable()
export class OrderHistoryService {
  private exchange: ccxt.binance;

  constructor() {
    // Khởi tạo Binance API với API key và Secret
    this.exchange = new ccxt.binance({
      apiKey: process.env.BINANCE_API_KEY,  
      secret: process.env.BINANCE_API_SECRET, 
      enableRateLimit: true,
      options: {
        defaultType: 'future',
      },
    });
  }

  async getOrderHistory(symbol: string = 'BTC/USDT') {
    try {
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