import { IsString, IsEmail, IsNumber } from 'class-validator';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  usd: string;

  @IsString()
  profit: string;

  @IsString()
  deathCount: number;

  @IsString()
  totalOrders: number;
}
