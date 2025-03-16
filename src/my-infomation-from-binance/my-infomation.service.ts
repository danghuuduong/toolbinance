import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as ccxt from 'ccxt';

@Injectable()
export class MyInfomationService {
  private exchange: ccxt.binance;

  constructor() {
    this.exchange = new ccxt.binance({
      apiKey: process.env.BINANCE_API_KEY,
      secret: process.env.BINANCE_API_SECRET,
      enableRateLimit: true,
      options: {
        defaultType: 'future', // Chỉ làm việc với Futures
      },
    });

    // Kiểm tra xem API Key và Secret đã được cấu hình đúng chưa
    if (!process.env.BINANCE_API_KEY || !process.env.BINANCE_API_SECRET) {
      throw new Error('API Key và API Secret chưa được cung cấp.');
    }
  }

  async getServerTime() {
    try {
      const response = await axios.get('https://api.binance.com/api/v3/time');
      return response.data.serverTime;  // Trả về serverTime từ Binance
    } catch (error) {
      console.error('Không thể lấy thời gian từ máy chủ Binance:', error);
      throw new Error('Không thể lấy thời gian từ máy chủ Binance.');
    }
  }

  async getMyInfomation() {
    try {
      const timestamp = await this.getServerTime();

      const balance = await this.exchange.fetchBalance({
        timestamp
      });

      if (!balance) {
        throw new Error('Không thể lấy thông tin số dư từ Binance.');
      }

      // In ra số dư của tài khoản
      const data = {
        info: balance.info,
        USDT: balance.USDT,
        free: balance.USDT.free,
        timestamp: balance.timestamp,
        datetime: balance.datetime,
      };

      return data;
    } catch (error) {
      console.error('Lỗi khi lấy thông tin tài khoản:', error.message);
      throw new Error('Lỗi khi lấy thông tin tài khoản: ' + error.message);
    }
  }
}
