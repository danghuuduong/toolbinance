import { HttpStatus, Injectable } from '@nestjs/common';
import { handleFoldingService } from 'src/common/until/handleFoldingToMoney/handleFolding.service';

@Injectable()
export class startTradingService {

  constructor(private readonly handleFoldingService: handleFoldingService) { }


  private isTrading: boolean = false;
  private foldingCurrent: number = 1;
  private largestMoneyState: string = "0";
  private totalAmount: number = 0;  // largestMoney + foldingCurrent
  private moneyfodingOne: number = 0;
  private isActiveExecuteTrade: boolean = false;
  private isWaitingForCompletion: boolean = false;
  private tradeRate: string = "0";

  async startTrading(payload) {
    const { tradeRate, largestMoney } = payload;
    const moneyforTrade = (Number(largestMoney) / 100) * Number(tradeRate) || 0;
    const moneyfodingOneCst = this.handleFoldingService.handleFodingToMoney(moneyforTrade, 1);

    this.isTrading = true;
    this.totalAmount = moneyforTrade  // Tổng tiền của 1 con Gà
    this.largestMoneyState = largestMoney; // số tiền lớn nhất
    this.moneyfodingOne = moneyfodingOneCst;
    this.tradeRate = tradeRate;
    return {
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'ok',
      isTrading: this.isTrading,
      foldingCurrent: 1,
      largestMoney: this.largestMoneyState,
      totalAmount: this.totalAmount,
      moneyfodingOne: this.moneyfodingOne,
      isActiveExecuteTrade: this.isActiveExecuteTrade,
      isWaitingForCompletion: this.isWaitingForCompletion,
      tradeRate: this.tradeRate,
    };
  }

  stopTrading() {
    this.isTrading = false;
    return { message: 'Giao dịch đã dừng' };
  }

  getStatusTrading() {
    return {
      isTrading: this.isTrading,
      foldingCurrent: this.foldingCurrent,
      largestMoney : this.largestMoneyState,
      totalAmount: this.totalAmount,
      moneyfodingOne: this.moneyfodingOne,
      isActiveExecuteTrade : this.isActiveExecuteTrade,
      isWaitingForCompletion: this.isWaitingForCompletion,
      tradeRate: this.tradeRate,
    };
  }
}
