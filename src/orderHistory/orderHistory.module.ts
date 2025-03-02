import { Module } from '@nestjs/common';
import { OrderHistoryService } from './orderHistory.service';
import { OrderHistoryController } from './orderHistory.controller';

@Module({
  controllers: [OrderHistoryController],
  providers: [OrderHistoryService],
})
export class OrderHistoryModule { }
