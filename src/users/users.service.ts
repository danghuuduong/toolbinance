import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { HttpStatus } from '@nestjs/common'; // Import HttpStatus
import * as crypto from 'crypto'; // Thêm import crypto
import { User, UserDocument } from './schemas/user.schema';
import { comparePasswordHelper, decryptText, encryptText, hashedPasswordHelper } from 'src/helper/until';

@Injectable()
export class UsersService {

  constructor(@InjectModel(User.name) private userModel: Model<User>) { }

  async create(createUserDto) {
    const isEmailExists = await this.userModel.findOne({ email: createUserDto.email }).exec();
    if (isEmailExists?._id) {
      return {
        statusCode: HttpStatus.BAD_REQUEST, // Sử dụng HttpStatus.BAD_REQUEST
        message: "Email đăng ký đã tồn tại",
      };
    }

    const hashedPassword = await hashedPasswordHelper(createUserDto.password)

    const { iv, salt, encrypted } = await encryptText(createUserDto.keySecret);
    console.log('Encrypted text:', encrypted.toString('hex'));

    const { name, email, keyApi } = createUserDto
    const createdUser = new this.userModel({
      name,
      email,
      password: hashedPassword,
      keyApi,
      keySecret: encrypted.toString('hex'),
    });
    const result = await createdUser.save();

    return {
      statusCode: HttpStatus.CREATED,
      message: "Tạo người dùng thành công",
      data: result?._id,
    };
  }

  async updateUser(updateUserDto) {
    const { _id, keyApi, keySecret } = updateUserDto;
    console.log('updateUserDto', updateUserDto);

    try {
      const updatedUser = await this.userModel.findByIdAndUpdate(
        _id,
        { keyApi, keySecret },
        { new: true, runValidators: true },
      ).exec();

      if (!updatedUser) {
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Người dùng không tìm thấy',
        };
      }

      return {
        statusCode: HttpStatus.OK,
        message: 'Cập nhật người dùng thành công',
        data: updatedUser?._id,
      };
    } catch (error) {
      console.error('Lỗi khi cập nhật người dùng:', error);
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Đã xảy ra lỗi khi cập nhật người dùng',
      };
    }
  }


  async findOneEmail(email: string) {
    return await this.userModel.findOne({ email }).exec();
  }

}
