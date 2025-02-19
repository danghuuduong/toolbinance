import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

// Định nghĩa kiểu dữ liệu của tài liệu
export type EmaCrossHistoryDocument = HydratedDocument<EmaCrossHistory>;

@Schema()
export class EmaCrossHistory {
  @Prop({ type: String })
  cross: 'up' | 'dow';

  @Prop({ type: Boolean })
  isActiveExecuteTrade: boolean;

  @Prop({ type: String })
  time: string;

  @Prop({ type: String })
  moneyFoldingOne: string;

  @Prop({ type: Number })
  foldingCurrent: number;
}

export const EmaCrossHistoryschema = SchemaFactory.createForClass(EmaCrossHistory);
