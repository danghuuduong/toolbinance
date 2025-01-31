import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { AmountService } from './amount.service';
import { CreateAmountDto } from './dto/create-amount.dto';
import { UpdateAmountDto } from './dto/update-amount.dto';

@Controller('amount')
export class AmountController {
  constructor(private readonly amountService: AmountService) {}
  @Get()
  findAll() {
    return this.amountService.findAll();
  }

  @Post()
  create(@Body() createAmountDto: CreateAmountDto) {
    return this.amountService.create(createAmountDto);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateAmountDto: UpdateAmountDto,
  ) {
    return this.amountService.update(id, updateAmountDto);
  }
}
