import { HttpStatus, Injectable } from '@nestjs/common';

@Injectable()
export class startTradingService {
  private isTrading: boolean = false;
  private totalAmount: number = 0;
  private moneyfodingOne: number = 0;
  private foldingCurrent: number = 0;

  async startTrading(payload) {
    const { moneyfodingOne, totalAmount, foldingCurrent } = payload;
    this.isTrading = true;
    this.totalAmount = totalAmount;
    this.moneyfodingOne = moneyfodingOne;
    this.foldingCurrent = foldingCurrent;

    return {
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'ok',
      isTrading: this.isTrading,
      moneyfodingOne,
      totalAmount,
      foldingCurrent,
    };
  }

  stopTrading() {
    this.isTrading = false;
    return { message: 'Giao dịch đã dừng' };
  }

  getStatusTrading() {
    return {
      isTrading: this.isTrading,
      totalAmount: this.totalAmount,
      moneyfodingOne: this.moneyfodingOne,
      foldingCurrent: this.foldingCurrent,
    };
  }
}
