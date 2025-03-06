import { Global, Module } from '@nestjs/common';
import { AmountService } from './amount.service';
import { AmountController } from './amount.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Amount, AmountSchema } from './schemas/amount.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Amount.name, schema: AmountSchema }]),
  ],
  controllers: [AmountController],
  providers: [AmountService],
  exports: [AmountService]
})
export class AmountModule { }
