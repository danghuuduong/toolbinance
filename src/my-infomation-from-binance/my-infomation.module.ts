import { Module } from '@nestjs/common';
import { MyInfomationService } from './my-infomation.service';
import { MyInfomationController } from './my-infomation.controller';

@Module({
  controllers: [MyInfomationController],
  providers: [MyInfomationService],
})
export class MyInfomationModule {}
