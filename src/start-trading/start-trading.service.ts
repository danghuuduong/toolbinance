import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { handleFoldingService } from 'src/common/until/handleFoldingToMoney/handleFolding.service';
import { StartTrading } from './schemas/start-trading..schema';
import { UpdateStartTradingDto } from './dto/update-status-trading.dto';
// import { UsersService } from 'src/users/users.service';

@Injectable()
export class startTradingService {

  constructor(
    private readonly handleFoldingService: handleFoldingService,
    @InjectModel(StartTrading.name) private startTradingModel: Model<StartTrading>

  ) { }

  async createStartTrading(id) {
    const newRespon = {
      id,
      isTrading: false,
      foldingCurrent: 1,
      largestMoney: 0,
      isActiveExecuteTrade: false,
      isWaitingForCompletion: false,
      tradeRate: "10",
    }
    const createdStartTrading = new this.startTradingModel(newRespon);
    const result = await createdStartTrading.save();

    return {
      statusCode: HttpStatus.OK,
      message: "ok",
      data: result?.id,
    };
  }

  async updateTrading(id: string, updateDto: UpdateStartTradingDto) {
    console.log("update", updateDto);

    if (!id || typeof id !== 'string') {
      throw new Error('Invalid ID.');
    }

    try {
      const updatedStartTrading = await this.startTradingModel.findOneAndUpdate(
        { id: id },
        { ...updateDto },
        { new: true } // Trả về bản ghi đã được cập nhật
      );

      if (!updatedStartTrading) {
        throw new Error('không tìm thấy status trading');
      }

      return updatedStartTrading;
    } catch (error) {
      throw new Error(`update status lỗi: ${error.message}`);
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

  async getTradingById(id: string) {
    try {
      const result = await this.startTradingModel.findOne({ id: id });
      if (!result) {
        throw new HttpException(
          'Trading data not found',
          HttpStatus.NOT_FOUND, // 404
        );
      }

      return {
        statusCode: HttpStatus.OK, // 200
        message: 'Trading data retrieved successfully',
        data: result,
      };
    } catch (error) {
      // Catch any errors (e.g., database issues, invalid ID)
      throw new HttpException(
        error.message || 'An unexpected error occurred',
        HttpStatus.INTERNAL_SERVER_ERROR, // 500
      );
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
