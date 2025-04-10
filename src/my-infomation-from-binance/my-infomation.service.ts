import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import axios from 'axios';
import * as ccxt from 'ccxt';
import { decryptText } from 'src/helper/until';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class MyInfomationService {
  private exchange: ccxt.binance;
  private usersService: UsersService;

  constructor(usersService: UsersService) {
    this.usersService = usersService;
  }


  private async setExchange(userId: string) {
    const userApiCredentials = await this.usersService.findOne(userId);

    const ivBuffer = Buffer.from(userApiCredentials?.iv, 'hex');
    const saltBuffer = Buffer.from(userApiCredentials?.salt, 'hex');
    const encryptedBuffer = Buffer.from(userApiCredentials?.secret, 'hex');

    const handleSecret = await decryptText(ivBuffer, saltBuffer, encryptedBuffer);

    this.exchange = new ccxt.binance({
      apiKey: userApiCredentials.keyApi,
      secret: handleSecret,
      enableRateLimit: true,
      options: { defaultType: 'future' },
    });
  }

  async getMyInfomation(userId: string) {
    try {
      await this.setExchange(userId);

      const timestamp = await this.getServerTime();
      const balance = await this.exchange.fetchBalance({ timestamp });

      if (!balance) {
        return;
      }

      return {
        info: balance.info,
        USDT: balance.USDT,
        free: balance.USDT.free,
        timestamp: balance.timestamp,
        datetime: balance.datetime,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.UNAUTHORIZED,
          message: 'Lỗi Key + secret ở sàn Binance',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  async getServerTime() {
    try {
      const response = await axios.get('https://api.binance.com/api/v3/time');
      return response.data.serverTime;
    } catch (error) {
      console.error('Không thể lấy thời gian:', error);
      throw new Error('Không thể lấy thời gian');
    }
  }
}
