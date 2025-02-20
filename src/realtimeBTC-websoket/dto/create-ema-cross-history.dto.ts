import { IsString, IsNumber, IsBoolean } from 'class-validator';

export class CreateEmaCrossHistoryDto {
  @IsString()
  cross: 'up' | 'down';

  @IsBoolean()
  isActiveExecuteTrade: boolean;

  @IsString()
  time: string;

  @IsString()
  moneyFoldingOne: string | number;

  @IsNumber()
  foldingCurrent: number;
}
