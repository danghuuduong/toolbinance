import { IsString, IsNumber, IsBoolean } from 'class-validator';

export class CreateEmaCrossHistoryDto {
  @IsString()
  cross: 'up' | 'down';

  @IsBoolean()
  isTrading: boolean;

  @IsBoolean()
  isActiveExecuteTrade: boolean;

  @IsBoolean()
  isWaitingForCompletion: boolean

  @IsString()
  tradeRate: number

  @IsString()
  time: string;

  @IsNumber()
  totalAmount: number

  @IsNumber()
  moneyfodingOne: number;

  @IsNumber()
  foldingCurrent: number;

  @IsNumber()
  largestMoney: number

}
