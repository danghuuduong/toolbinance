import { IsString, IsEmail, IsNumber } from 'class-validator';

export class startTradingDto {
  @IsNumber()
  moneyfodingOne: number;

  @IsNumber()
  totalAmount: number;

  @IsNumber()
  foldingCurrent: number;
}
