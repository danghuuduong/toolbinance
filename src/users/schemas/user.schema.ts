import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CatDocument = HydratedDocument<User>;

@Schema()
export class User {
  @Prop({ type: String })
  name: string;

  @Prop({ type: String })
  email: string;

  @Prop({ type: String })
  usd: string;

  @Prop({ type: String })
  profit: string;

  @Prop({ type: String })
  deathCount: String;

  @Prop({ type: String })
  totalOrders: String;
}

export const UserSchema = SchemaFactory.createForClass(User);
