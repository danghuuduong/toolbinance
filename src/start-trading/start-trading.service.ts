import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { handleFoldingService } from 'src/common/until/handleFoldingToMoney/handleFolding.service';
import { StartTrading } from './schemas/start-trading..schema';
import { UpdateStartTradingDto } from './dto/update-status-trading.dto';

@Injectable()
export class startTradingService {

  constructor(private readonly handleFoldingService: handleFoldingService,
    @InjectModel(StartTrading.name) private startTradingModel: Model<StartTrading>
  ) { }

  async startTrading(payload) {
    const { tradeRate, largestMoney, isTrading } = payload;
    const totalAmount = (Number(largestMoney) / 100) * Number(tradeRate) || 0;
    const moneyfodingOne = this.handleFoldingService.handleFodingToMoney(totalAmount, 1);
    const newRespon = {
      statusCode: HttpStatus.OK,
      message: 'ok',
      isTrading: isTrading || false,
      foldingCurrent: 1,
      largestMoney: largestMoney,
      totalAmount: totalAmount,
      moneyfodingOne: moneyfodingOne,
      isActiveExecuteTrade: false,
      isWaitingForCompletion: false,
      tradeRate: tradeRate,
    }
    const createdStartTrading = new this.startTradingModel(newRespon);
    const result = await createdStartTrading.save();
    return result
  }

  async updateTrading(id: string, updateDto: UpdateStartTradingDto) {
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid ID.');
    }

    try {
      const updatedStartTrading = await this.startTradingModel.findByIdAndUpdate(
        id,
        { ...updateDto },
        { new: true } // Trả về bản ghi đã được cập nhật
      );

      if (!updatedStartTrading) {
        throw new Error('Trading record not found.');
      }

      return updatedStartTrading;
    } catch (error) {
      throw new Error(`Failed to update trading record: ${error.message}`);
    }
  }

  async getStartTradingData() {
    try {
      const data = await this.startTradingModel.find().exec();
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

  async stopTrading() {
    const { data } = await this.getStartTradingData();
    const resultSttatusTrading = data?.[0]
    resultSttatusTrading?._id && this.updateTrading(resultSttatusTrading._id.toString(), { isWaitingForCompletion: true, });
    const newRespon = {
      statusCode: HttpStatus.OK,
      message: 'ok',
    }

    return newRespon;
  }
}
