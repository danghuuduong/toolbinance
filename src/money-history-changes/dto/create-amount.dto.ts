import { IsString } from 'class-validator';

export class CreateAmountDto {
  @IsString({ each: true })
  history: string[];
}
