import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { HOrderDocument, Order } from '../DB/models/order.model.js';
import { Cart, HCartDocument } from '../DB/models/cart.model.js';
import { HProductDocument, Product } from '../DB/models/product.model.js';
import { Coupon, HCouponDocument } from '../DB/models/coupon.model.js';
import {
  OrderStatusEnum,
  PaymentMethodEnum,
} from '../common/enums/order.enum.js';
import { SocketService } from '../socket/socket.service.js';
import type { HUserDocument } from '../DB/models/user.model.js';
import { PaymentService } from '../common/ServicesPayment/payment/payment.service.js';
import Stripe from 'stripe';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name)
    private readonly _orderModel: Model<HOrderDocument>,
    @InjectModel(Cart.name) private readonly _cartModel: Model<HCartDocument>,
    @InjectModel(Product.name)
    private readonly _productModel: Model<HProductDocument>,
    @InjectModel(Coupon.name)
    private readonly _couponModel: Model<HCouponDocument>,
    private readonly _socketService: SocketService,

    private readonly paymentService: PaymentService,
  ) {}

  async createOrder(createOrderDto: CreateOrderDto, userId: Types.ObjectId) {
    const cart = await this._cartModel.findOne({ user: userId });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException(
        'Your Checkout pipeline failed because your cart is empty',
      );
    }

    const orderItems: any[] = [];
    let calculatedSubTotal = 0;

    for (const item of cart.items) {
      const dbProduct = await this._productModel.findById(item.product);
      if (!dbProduct) {
        throw new NotFoundException(
          `Product with ID ${item.product} not found`,
        );
      }

      if (dbProduct.stock < item.quantity) {
        throw new BadRequestException(
          `insuffecent stock. only ${dbProduct.stock} units available `,
        );
      }

      calculatedSubTotal += item.quantity * dbProduct.price;
      orderItems.push({
        product: item.product,
        quantity: item.quantity,
        priceSnapShot: dbProduct.price,
      });
    }

    let discountAmount = 0;
    let targetCoupon: HCouponDocument | null = null;

    if (createOrderDto.appliedCoupon) {
      targetCoupon = await this._couponModel.findOne({
        code: createOrderDto.appliedCoupon.toUpperCase().trim(),
      });
      if (!targetCoupon) {
        throw new NotFoundException('Oops! Coupon is invalid or expired');
      }

      if (targetCoupon.expiryDate <= new Date()) {
        throw new BadRequestException('Oops! Coupon is invalid or expired');
      }

      if (targetCoupon.usedCount >= targetCoupon.maxUsageCount) {
        throw new BadRequestException('Oops! Coupon is invalid or expired');
      }

      discountAmount =
        (calculatedSubTotal * targetCoupon.discountPercentage) / 100;
    }

    const finalTotal = calculatedSubTotal - discountAmount;

    // update stock

    for (const item of orderItems) {
      const updatedProducts = await this._productModel.findByIdAndUpdate(
        item.product,
        { $inc: { stock: -item.quantity } },
        { returnDocument: 'after' },
      );

      if (updatedProducts) {
        if (updatedProducts.stock <= 5 && updatedProducts.stock > 0) {
          this._socketService.emitToRoom(
            `product:${updatedProducts._id}`,
            'lowStockAlert',
            {
              productId: updatedProducts._id,
              productName: updatedProducts.title,
              currentStock: updatedProducts.stock,
              message: `Running low! Only ${updatedProducts.stock} left of ${updatedProducts.title}`,
            },
          );
        }
        if (updatedProducts.stock === 0) {
          this._socketService.emitToAll('productSoldOut', {
            productId: updatedProducts._id,
            productName: updatedProducts.title,
            message: `${updatedProducts.title} is now complatley out of stock`,
          });
        }
      }
    }

    if (targetCoupon) {
      await this._couponModel.findByIdAndUpdate(
        targetCoupon._id,
        { $inc: { usedCount: 1 } },
        { $push: { usedBy: userId } },
      );
    }

    const Order = new this._orderModel({
      user: userId,
      items: orderItems,
      subTotal: calculatedSubTotal,
      discountAmount,
      finalTotal,
      shippingAddress: createOrderDto.shippingAddress,
      phone: createOrderDto.phone,
      paymentMethod: createOrderDto.paymentMethod,
      appliedCoupon: targetCoupon ? targetCoupon._id : null,
      status: OrderStatusEnum.PENDING,
    });
    await Order.save();

    cart.items = [];
    cart.totalPrice = 0;
    await cart.save();

    return Order;
  }

  // async createCheckoutSession(
  //   orderId: Types.ObjectId,
  //   userId: Types.ObjectId,
  // ): Promise<Stripe.Response<Stripe.Checkout.Session>> {
  //   const order = await this._orderModel
  //     .findOne({
  //       _id: orderId,
  //       user: userId,
  //       status: OrderStatusEnum.PENDING,
  //       paymentMethod: PaymentMethodEnum.CARD,
  //     })
  //     .populate([
  //       { path: 'user' },
  //       { path: 'items.product' },
  //       { path: 'appliedCoupon' },
  //     ]);

  //   if (!order) {
  //     throw new NotFoundException('Order Not Found');
  //   }

  //   const amount = order.finalTotal ?? order.subTotal ?? 0;

  //   const line_items = [
  //     {
  //       price_data: {
  //         currency: 'egp',
  //         product_data: {
  //           name: `Order ${(order.user as unknown as HUserDocument).firstName}`,
  //           description: `payment for order on address ${order.shippingAddress}`,
  //         },
  //         unit_amount: Math.round(amount * 100),
  //       },
  //       quantity: 1,
  //     },
  //   ];

  //   let discounts: Stripe.Checkout.SessionCreateParams.Discount[] = [];

  //   if (order.discountAmount) {
  //     const coupon = await this.paymentService.createCoupon({
  //       duration: 'once',
  //       currency: 'egp',
  //       // percent_off: order.discountAmount,
  //       percent_off: Math.round(order.discountAmount * 100),
  //     });
  //     discounts.push({ coupon: coupon.id });
  //   }

  //   const session = await this.paymentService.checkoutSession({
  //     customer_email: (order.user as unknown as HUserDocument).email,
  //     line_items: line_items,
  //     mode: 'payment',
  //     discounts,
  //     metadata: { orderId: orderId.toString() },
  //   });

  //   return session;
  // }

  async createCheckoutSession(
    orderId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<Stripe.Response<Stripe.Checkout.Session>> {
    const order = await this._orderModel
      .findOne({
        _id: orderId,
        user: userId,
        status: OrderStatusEnum.PENDING,
        paymentMethod: PaymentMethodEnum.CARD,
      })
      .populate([
        { path: 'user' },
        { path: 'items.product' },
        { path: 'appliedCoupon' },
      ]);

    if (!order) {
      throw new NotFoundException('Order Not Found');
    }

    const amount = order.subTotal ?? 0;

    const line_items = [
      {
        price_data: {
          currency: 'egp',
          product_data: {
            name: `Order ${(order.user as unknown as HUserDocument).firstName}`,
            description: `payment for order on address ${order.shippingAddress}`,
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      },
    ];

    const discounts: Stripe.Checkout.SessionCreateParams.Discount[] = [];

    if (order.discountAmount && order.discountAmount > 0) {
      const coupon = await this.paymentService.createCoupon({
        duration: 'once',
        currency: 'egp',
        amount_off: Math.round(order.discountAmount * 100),
        name: (order.appliedCoupon as unknown as HCouponDocument)?.code,
      });
      discounts.push({ coupon: coupon.id });
    }

    const session = await this.paymentService.checkoutSession({
      customer_email: (order.user as unknown as HUserDocument).email,
      line_items,
      mode: 'payment',
      discounts,
      metadata: { orderId: orderId.toString() },
    });

    const method = await this.paymentService.createPaymentMethod({
      type: process.env.TYPE_METHOD,
      card: { token: process.env.TOKEN_CARD_METHOD },
    });

    // const intent = await this.paymentService.createPaymentIntent({
    //   amount: Math.round(order.subTotal * 100),
    //   currency: 'egp',
    //   payment_method: method.id,
    //   payment_method_types: [PaymentMethodEnum.CARD],
    // });

    const intent = await this.paymentService.createPaymentIntent({
      amount: Math.round(order.subTotal * 100),
      currency: 'egp',
      payment_method: method.id,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
    });

    order.intentId = intent.id;
    await order.save();

    await this.paymentService.confirmPaymentIntent(intent.id);

    return session;
  }

  async refundOrder(orderId: Types.ObjectId, userId: Types.ObjectId) {
    const order = await this._orderModel.findOne({
      _id: orderId,
      user: userId,
      paymentMethod: PaymentMethodEnum.CARD,
    });

    if (!order) {
      throw new NotFoundException('Order Not Found');
    }

    if (!order.intentId) {
      throw new BadRequestException('no payment intent found for this order');
    }

    const refund = await this.paymentService.createRefund(order.intentId);

    await this._orderModel.findByIdAndUpdate(
      orderId,
      {
        status: OrderStatusEnum.CANCELLED,
        refundId: refund.id,
        refundedAt: new Date(),
        $unset: { intentId: true },
        $inc: { __v: 1 },
      },
      { returnDocument: 'after' },
    );

    return order;
  }
}
