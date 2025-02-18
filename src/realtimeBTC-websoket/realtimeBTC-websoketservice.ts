import { Injectable } from '@nestjs/common';
import { CandleService } from 'src/candle/candle.service';
import { Timeframe } from 'src/candle/dto/timeframe.enum';
import { EMA } from 'technicalindicators';

@Injectable()
export class realtimeBTCWebsoketService {
  constructor(private readonly candleService: CandleService) { }
  private pricesCandleCloseList: number[] = [];
  private emaStatus: { status: string; time: string } = {
    status: 'no',
    time: 'null',
  };

  async mainTrading(timeString: string) {
    try {
      const candleList = await this.callApiGetCandle();
      this.pricesCandleCloseList = candleList.map((value) => value.close);
    }
    catch (error) { console.error('Error get Api 60 record faild', error); }

    const crossoverResult = this.checkEmaCrossover(this.pricesCandleCloseList);
    return this.emaStatus = { status: crossoverResult, time: crossoverResult !== "no" ? timeString : "null" };
  }

  checkEmaCrossover(pricesCandleCloseList: number[]): string {
    const ema9 = EMA.calculate({ period: 9, values: pricesCandleCloseList });
    const ema25 = EMA.calculate({ period: 25, values: pricesCandleCloseList });

    if (ema9.length > 1 && ema25.length > 1) {
      const lastEma9 = ema9[ema9.length - 1];
      const lastEma25 = ema25[ema25.length - 1];
      const previousEma9 = ema9[ema9.length - 2];
      const previousEma25 = ema25[ema25.length - 2];
      if (lastEma9 > lastEma25 && previousEma9 <= previousEma25) {
        return "up";
      } else if (lastEma9 < lastEma25 && previousEma9 >= previousEma25) {
        return "down";
      }
    }
    return "no";
  }

  async callApiGetCandle() {
    return this.candleService.getBTCOLHCandles({
      limit: "60",
      type: Timeframe.ONE_MINUTE,
    })
  }

  getEmaStatus() { return this.emaStatus}
}
