import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type StartTradingDocument = HydratedDocument<StartTrading>;

@Schema()
export class StartTrading {
  @Prop({ type: String })
  id: string;

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

  @Prop({ type: String })
  idOrderMain: string;

  @Prop({ type: String })
  idStopLossOrder: string;

  @Prop({ type: String })
  idTakeProfitOrder: string;
}

export const StartTradingchema = SchemaFactory.createForClass(StartTrading);
