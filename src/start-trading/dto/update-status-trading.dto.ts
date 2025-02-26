import { IsBoolean, IsOptional, IsNumber, IsString } from 'class-validator';

export class UpdateStartTradingDto {
    @IsOptional()
    @IsBoolean()
    isActiveExecuteTrade?: boolean; 
    @IsOptional()
    @IsBoolean()
    isTrading?: boolean;

    @IsOptional()
    @IsBoolean()
    isWaitingForCompletion?: boolean;

    @IsOptional()
    @IsNumber()
    tradeRate?: number;

    @IsOptional()
    @IsString()
    largestMoney?: string;

    @IsOptional()
    @IsNumber()
    totalAmount?: number;

    @IsOptional()
    @IsNumber()
    moneyfodingOne?: number;

    @IsOptional()
    @IsNumber()
    foldingCurrent?: number;
}
