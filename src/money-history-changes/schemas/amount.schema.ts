import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AmountDocument = HydratedDocument<Amount>;

@Schema()
export class Amount {
  @Prop({ type: [String] })
  history: string[];

  @Prop({ type: String })
  largest: string;
}

export const AmountSchema = SchemaFactory.createForClass(Amount);
