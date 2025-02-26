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
    const { tradeRate, largestMoney } = payload;
    const totalAmount = (Number(largestMoney) / 100) * Number(tradeRate) || 0;
    const moneyfodingOne = this.handleFoldingService.handleFodingToMoney(totalAmount, 1);
    const newRespon = {
      statusCode: HttpStatus.OK,
      message: 'ok',
      isTrading: true,
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
    // Kiểm tra xem id có hợp lệ hay không
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid ID.');
    }

    // Kiểm tra xem isActiveExecuteTrade có được cung cấp không
    if (updateDto.isActiveExecuteTrade === undefined) {
      throw new Error('isActiveExecuteTrade is required for update.');
    }

    try {
      // Cập nhật chỉ trường isActiveExecuteTrade
      const updatedStartTrading = await this.startTradingModel.findByIdAndUpdate(
        id,
        { isActiveExecuteTrade: updateDto.isActiveExecuteTrade }, // Chỉ cập nhật trường này
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

  stopTrading() {
    return { message: 'Giao dịch đã dừng' };
  }
}
