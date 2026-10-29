import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, Schema as MongooseSchema } from 'mongoose';

@ObjectType()
export class CouponCreator {
  @Field(() => String, { nullable: true })
  firstName?: string;

  @Field(() => String, { nullable: true })
  lastName?: string;

  @Field(() => String, { nullable: true })
  email?: string;
}

@ObjectType()
@Schema({ timestamps: true })
export class Coupon {
  @Field(() => ID)
  _id: string;

  @Field(() => String)
  @Prop({
    type: String,
    unique: true,
    required: true,
    uppercase: true,
    trim: true,
  })
  code: string;

  @Field(() => Int)
  @Prop({
    type: Number,
    required: true,
    min: 1,
    max: 100,
  })
  discountPercentage: number;

  @Field(() => String)
  @Prop({
    type: Date,
    required: true,
    expires: 0,
  })
  expiryDate: Date;

  @Field(() => Int)
  @Prop({
    type: Number,
    required: true,
    min: 1,
    default: 100,
  })
  maxUsageCount: number;

  @Field(() => Int)
  @Prop({
    type: Number,
    min: 0,
    default: 0,
  })
  usedCount: number;

  @Field(() => [ID])
  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }],
    default: [],
  })
  usedBy: Types.ObjectId[];

  @Field(() => CouponCreator, { nullable: true })
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    required: true,
    ref: 'User',
  })
  createdBy: Types.ObjectId | CouponCreator;
}

export const couponSchema = SchemaFactory.createForClass(Coupon);

export type HCouponDocument = HydratedDocument<Coupon>;

export const CouponModel = MongooseModule.forFeature([
  { name: Coupon.name, schema: couponSchema },
]);
