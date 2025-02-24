import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type StartTradingDocument = HydratedDocument<StartTrading>;

@Schema()
export class StartTrading {
  @Prop({ type: Boolean })
  isTrading: boolean;

  @Prop({ type: Number })
  foldingCurrent: number;

  @Prop({ type: Number })
  largestMoney: number;

  @Prop({ type: Number })
  totalAmount: number;

  @Prop({ type: Number })
  moneyfodingOne: number;

  @Prop({ type: Boolean })
  isActiveExecuteTrade: boolean;

  @Prop({ type: Boolean })
  isWaitingForCompletion: boolean;

  @Prop({ type: Number })
  tradeRate: number;
}

export const StartTradingchema = SchemaFactory.createForClass(StartTrading);
