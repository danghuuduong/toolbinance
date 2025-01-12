import { PartialType } from '@nestjs/mapped-types';
import { CreateStatusTradingDto } from './create-status-trading.dto';

export class UpdateStatusTradingDto extends PartialType(CreateStatusTradingDto) {}
