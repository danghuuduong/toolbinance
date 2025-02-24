import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { handleFoldingService } from 'src/common/until/handleFoldingToMoney/handleFolding.service';
import { StartTrading } from './schemas/start-trading..schema';

@Injectable()
export class startTradingService {

  constructor(private readonly handleFoldingService: handleFoldingService,
    @InjectModel(StartTrading.name) private StartTradingModel: Model<StartTrading>
  ) { }

  async startTrading(payload) {
    const { tradeRate, largestMoney } = payload;
    const totalAmount = (Number(largestMoney) / 100) * Number(tradeRate) || 0;
    const moneyfodingOne = this.handleFoldingService.handleFodingToMoney(totalAmount, 1);
    const newRespon = {
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'ok',
      isTrading: true,
      foldingCurrent: 1,
      largestMoney: largestMoney,
      totalAmount: totalAmount,
      moneyfodingOne: moneyfodingOne,
      isActiveExecuteTrade: true,
      isWaitingForCompletion: false,
      tradeRate: tradeRate,
    }
    const createdStartTrading = new this.StartTradingModel(newRespon);
    const result = await createdStartTrading.save();
    return result
  }

  async getStartTradingData() {
    try {
      const data = await this.StartTradingModel.find().exec();
      return {
        statusCode: data ? HttpStatus.OK : HttpStatus.NOT_FOUND,
        message: data ? 'Successfully fetched start trading data' : "No start trading data found",
        data: data,
      };
    } catch (error) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error while fetching start trading data',
        error: error.message,
      };
    }
  }

  stopTrading() {
    return { message: 'Giao dịch đã dừng' };
  }
}
