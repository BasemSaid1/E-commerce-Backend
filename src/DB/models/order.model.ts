import { MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import {
  OrderStatusEnum,
  PaymentMethodEnum,
} from '../../common/enums/order.enum.js';

@Schema({
  _id: false,
})
export class OrderItem {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Product', required: true })
  product: Types.ObjectId;

  @Prop({ type: Number, required: true })
  quantity: number;

  @Prop({ type: Number, required: true })
  priceSnapShot: number;
}

@Schema({
  timestamps: true,
})
export class Order {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: [OrderItem], required: true })
  items: OrderItem[];

  @Prop({ type: Number, required: true })
  subTotal: number;

  @Prop({ type: Number, default: 0 })
  discountAmount: number;

  @Prop({ type: Number, required: true })
  finalTotal: number;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(OrderStatusEnum),
    default: OrderStatusEnum.PENDING,
  })
  status: string;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(PaymentMethodEnum),
    default: PaymentMethodEnum.CARD,
  })
  paymentMethod: string;

  @Prop({ type: String, required: true, trim: true })
  shippingAddress: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Coupon' })
  appliedCoupon: string;

  @Prop({ type: String, required: true })
  phone: string;

  @Prop({ type: String })
  intentId: string;

  @Prop({ type: String })
  refundId: string;

  @Prop({ type: Date })
  refundedAt: Date;
}

export const orderSchema = SchemaFactory.createForClass(Order);

export type HOrderDocument = HydratedDocument<Order>;

export const OrderModel = MongooseModule.forFeature([
  { name: Order.name, schema: orderSchema },
]);
