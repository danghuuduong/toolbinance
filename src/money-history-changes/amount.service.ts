import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Amount } from './schemas/amount.schema';
import { CreateAmountDto } from './dto/create-amount.dto';
import { Model } from 'mongoose';
import { UpdateAmountDto } from './dto/update-amount.dto';

@Injectable()
export class AmountService {
  constructor(@InjectModel(Amount.name) private amountModel: Model<Amount>) { }

  async create(createAmountDto: CreateAmountDto) {
    const created = new this.amountModel(createAmountDto);
    const result = await created.save();
    return result;
  }

  async findAll() {
    const result = await this.amountModel.find().exec();
    return result;
  }

  async update(id: string, updateAmountDto: UpdateAmountDto) {
    const { history } = updateAmountDto;

    const existingAmount = await this.amountModel
      .findByIdAndUpdate(
        id,
        {
          $push: {
            history: { $each: history },  
          },
        },
        { new: true } 
      )
      .exec();

    if (!existingAmount) {
      throw new NotFoundException(`Amount with ID ${id} not found`);
    }

    return existingAmount;
  }
}
