import { Injectable } from '@nestjs/common';
import * as ccxt from 'ccxt';

@Injectable()
export class MyInfomationService {
  private exchange: ccxt.binance;

  constructor() {
    this.exchange = new ccxt.binance({
      apiKey:
        'fe3a0df4e1158de142af6a1f75cdb61771f05a21c7e13d7000f6340a65ba1440',
      secret:
        '77068e56cc0f1c8a7ed58ae2962cc35c896e1c80c7832d6ad0fc7407f850d6fe',
      enableRateLimit: true,
      options: {
        defaultType: 'future', // Chỉ làm việc với Futures
      },
    }); // Sử dụng Binance để lấy dữ liệu
  }
  // https://testnet.binancefuture.com/vi/futures/BTCUSDT
  async getMyInfomation() {
    try {
      // Thiết lập chế độ Sandbox (testnet)
      this.exchange.setSandboxMode(true);

      const balance = await this.exchange.fetchBalance();

      // In ra số dư của tài khoản
      const data = {
        info: balance.info,
        USDT: balance.USDT,
        free: balance.USDT,
        timestamp: balance.timestamp,
        datetime: balance.datetime,
      };
      console.log('data: ne', data);

      return data;
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  }
}
