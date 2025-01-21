import { Controller, Get } from '@nestjs/common';
import { MyInfomationService } from './my-infomation.service';

@Controller('my-infomation')
export class MyInfomationController {
  constructor(private readonly myInfomationService: MyInfomationService) {}

  @Get()
  findAll() {
    return this.myInfomationService.getMyInfomation();
  }
}
