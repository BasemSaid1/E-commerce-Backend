import { MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class Coupon {
  @Prop({
    type: String,
    unique: true,
    required: true,
    uppercase: true,
    trim: true,
  })
  code: string;

  @Prop({
    type: Number,
    required: true,
    min: 1,
    max: 100,
  })
  discountPercentage: number;

  @Prop({
    type: Date,
    required: true,
    expires: 0,
  })
  expiryDate: Date;

  @Prop({
    type: Number,
    required: true,
    min: 1,
    default: 100,
  })
  maxUsageCount: number;

  @Prop({
    type: Number,
    min: 0,
    default: 0,
  })
  usedCount: number;

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }],
    default: [],
  })
  usedBy: Types.ObjectId[];

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    required: true,
    ref: 'User',
  })
  createdBy: Types.ObjectId;
}

export const couponSchema = SchemaFactory.createForClass(Coupon);

export type HCouponDocument = HydratedDocument<Coupon>;

export const CouponModel = MongooseModule.forFeature([
  { name: Coupon.name, schema: couponSchema },
]);
