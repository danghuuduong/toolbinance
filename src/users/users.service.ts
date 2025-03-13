import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './schemas/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) { }

  async create(createUserDto: CreateUserDto) {
    console.log("createUserDto", createUserDto);

    // const createdUser = new this.userModel(createUserDto);
    // const result = await createdUser.save();
    // return result;
  }

  async findAll() {
    const result = await this.userModel.find().exec();
    return result;
  }
}
