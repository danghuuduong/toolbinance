import { Injectable } from '@nestjs/common';
import { CandleService } from 'src/candle/candle.service';
import { Timeframe } from 'src/candle/dto/timeframe.enum';

@Injectable()
export class realtimeBTCWebsoketService {
  constructor(private readonly candleService: CandleService) { }

  async mainTrading(candlestick) {
    console.log('candlestick', candlestick);

    try {
      const data = await this.callApi();
      console.log("🚀 ~callApi:", data)
    } catch (error) {

    }
    // const candlestick = data.k;
    // console.log('candlestick.x', candlestick); //1
    // const closePrice = parseFloat(candlestick.c);
    // // Lưu giá đóng cửa của cây nến vào mảng
    // this.prices.push(closePrice);
    // // Giới hạn số lượng giá trong 1 giờ (tối đa 60 cây nến)
    // if (this.prices.length > 60) {
    //   this.prices.shift(); // Xóa cây nến cũ nhất (đầu tiên trong mảng)
    // }
    // // In ra thời gian cây nến (giờ và phút)
    // const openTime = new Date(candlestick.t);
    // const hour = openTime.getHours();
    // const minute = openTime.getMinutes();
    // console.log(
    //   `Cây nến bắt đầu vào lúc: ${openTime.toLocaleString()} (${hour}:${minute})`,
    // );
    // // Tính toán EMA 9 và EMA 25
    // const ema9 = EMA.calculate({ period: 9, values: this.prices });
    // const ema25 = EMA.calculate({ period: 25, values: this.prices });
    // // Kiểm tra giao cắt EMA
    // const crossoverResult = this.checkEmaCrossover(ema9, ema25);
  }

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

  async callApi() {
    return this.candleService.getBTCOLHCandles({
      limit: "10",
      type: Timeframe.ONE_MINUTE,
    })
  }
}
