import { IsString, IsEmail, IsNumber, isString, IsBoolean } from 'class-validator';

export class startTradingDto {
  @IsString()
  tradeRate: string;
  @IsString()
  largestMoney: string;
}
