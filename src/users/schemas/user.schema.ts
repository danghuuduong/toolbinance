import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

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
  deathCount: string;

  @Prop({ type: String })
  totalOrders: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
