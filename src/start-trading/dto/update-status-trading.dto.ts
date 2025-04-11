import { IsBoolean, IsOptional, IsNumber, IsString } from 'class-validator';

export class UpdateStartTradingDto {

    @IsOptional()
    @IsBoolean()
    id?: string; 


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
    foldingCurrent?: number;

    @IsOptional()
    @IsString()
    idOrderMain?: string;

    @IsOptional()
    @IsString()
    idStopLossOrder?: string;

    @IsOptional()
    @IsString()
    idTakeProfitOrder?: string;

    @IsOptional()
    @IsString()
    timeActiveExecuteTrade?: string;
}
