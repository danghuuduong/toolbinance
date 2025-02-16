import { PartialType } from '@nestjs/mapped-types';
import { startTradingDto } from './start-trading.dto';

export class UpdateStatusTradingDto extends PartialType(startTradingDto) {}
