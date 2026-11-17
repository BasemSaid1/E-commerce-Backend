import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { isValidObjectId, Model, Types } from 'mongoose';
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
import { CachingService } from '../caching/caching.service.js';

// الانتقالات المسموحة للأدمن
const ADMIN_TRANSITIONS: Record<string, OrderStatusEnum[]> = {
  [OrderStatusEnum.PENDING]: [
    OrderStatusEnum.CONFIRMED,
    OrderStatusEnum.CANCELLED,
  ],
  [OrderStatusEnum.PAID]: [
    OrderStatusEnum.CONFIRMED,
    OrderStatusEnum.CANCELLED,
  ],
  [OrderStatusEnum.CONFIRMED]: [
    OrderStatusEnum.SHIPPED,
    OrderStatusEnum.CANCELLED,
  ],
  [OrderStatusEnum.SHIPPED]: [OrderStatusEnum.DELIVERED],
};

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
    private readonly _cache: CachingService,
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

      let unitPrice = dbProduct.price;
      let availableStock = dbProduct.stock;
      let variantLabel: string | undefined;

      if (dbProduct.variants?.length > 0) {
        const variant = item.variantId
          ? dbProduct.variants.find(
              (v) => v._id.toString() === item.variantId!.toString(),
            )
          : undefined;
        if (!variant) {
          throw new BadRequestException('selected option is not available');
        }
        unitPrice = variant.price;
        availableStock = variant.stock;
        variantLabel = variant.attributes
          .map((a) => `${a.name}: ${a.value}`)
          .join(' • ');
      } else if (item.variantId) {
        throw new BadRequestException('selected option is not available');
      }

      if (availableStock < item.quantity) {
        throw new BadRequestException(
          `insuffecent stock. only ${availableStock} units available `,
        );
      }

      calculatedSubTotal += item.quantity * unitPrice;
      orderItems.push({
        product: item.product,
        ...(item.variantId ? { variantId: item.variantId, variantLabel } : {}),
        quantity: item.quantity,
        priceSnapShot: unitPrice,
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

    const reserved: {
      item: (typeof orderItems)[number];
      product: HProductDocument;
    }[] = [];

    try {
      for (const item of orderItems) {
        const updated = await this.adjustStock(item, -item.quantity);
        if (!updated) {
          throw new BadRequestException(
            'some items in your cart are no longer available in the requested quantity',
          );
        }
        reserved.push({ item, product: updated });
      }
    } catch (error) {
      for (const { item } of reserved) {
        await this.adjustStock(item, item.quantity);
      }
      throw error;
    }

    for (const { item, product } of reserved) {
      this.emitStockAlerts(product, item.variantId);
    }

    await this._cache.invalidateProducts();

    if (targetCoupon) {
      await this._couponModel.findByIdAndUpdate(targetCoupon._id, {
        $inc: { usedCount: 1 },
        $push: { usedBy: userId },
      });
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

  // بيحجز (delta سالب) أو بيرجّع (delta موجب) مخزون المنتج أو التركيبة بشكل ذري
  private adjustStock(
    item: {
      product: Types.ObjectId | string;
      variantId?: Types.ObjectId | string;
    },
    delta: number,
  ) {
    const reserving = delta < 0;

    if (item.variantId) {
      return this._productModel.findOneAndUpdate(
        {
          _id: item.product,
          variants: {
            $elemMatch: {
              _id: item.variantId,
              ...(reserving ? { stock: { $gte: -delta } } : {}),
            },
          },
        },
        { $inc: { 'variants.$.stock': delta, stock: delta } },
        { returnDocument: 'after' },
      );
    }

    return this._productModel.findOneAndUpdate(
      { _id: item.product, ...(reserving ? { stock: { $gte: -delta } } : {}) },
      { $inc: { stock: delta } },
      { returnDocument: 'after' },
    );
  }

  private emitStockAlerts(
    product: HProductDocument,
    variantId?: Types.ObjectId | string,
  ) {
    const variant = variantId
      ? product.variants?.find((v) => v._id.toString() === variantId.toString())
      : undefined;

    const currentStock = variant ? variant.stock : product.stock;
    const name = variant
      ? `${product.title} (${variant.attributes.map((a) => a.value).join(' / ')})`
      : product.title;

    if (currentStock <= 5 && currentStock > 0) {
      this._socketService.emitToRoom(
        `product:${product._id}`,
        'lowStockAlert',
        {
          productId: product._id,
          productName: name,
          currentStock,
          message: `Running low! Only ${currentStock} left of ${name}`,
        },
      );
    }
    if (product.stock === 0) {
      this._socketService.emitToAll('productSoldOut', {
        productId: product._id,
        productName: product.title,
        message: `${product.title} is now complatley out of stock`,
      });
    }
  }

  private assertValidId(id: Types.ObjectId | string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid order id');
    }
  }

  async findMyOrders(userId: Types.ObjectId) {
    return this._orderModel
      .find({ user: userId })
      .select('-intentId -sessionId -refundId -__v')
      .populate('items.product', 'title image price')
      .populate('appliedCoupon', 'code discountPercentage')
      .sort({ createdAt: -1 })
      .lean();
  }

  // ───────────── الأدمن ─────────────

  async findAllForAdmin(query: {
    page: number;
    limit: number;
    status?: string;
  }) {
    const page =
      Number.isInteger(query.page) && query.page > 0 ? query.page : 1;
    const limit =
      Number.isInteger(query.limit) && query.limit > 0
        ? Math.min(query.limit, 50)
        : 10;

    const filter: Record<string, unknown> = {};
    if (query.status) {
      if (
        !Object.values(OrderStatusEnum).includes(
          query.status as OrderStatusEnum,
        )
      ) {
        throw new BadRequestException('Invalid order status');
      }
      filter.status = query.status;
    }

    const [orders, total] = await Promise.all([
      this._orderModel
        .find(filter)
        .select('-intentId -sessionId -refundId -__v')
        .populate('user', 'firstName lastName email')
        .populate('items.product', 'title image price')
        .populate('appliedCoupon', 'code discountPercentage')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this._orderModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      orders,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getAdminStats() {
    const [byStatus, revenueAgg, lowStock, outOfStock] = await Promise.all([
      this._orderModel.aggregate<{ _id: string; count: number }>([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      // الإيراد: بطاقة مدفوعة (ومتقدمة)، أو كاش اتسلّم
      this._orderModel.aggregate<{ _id: null; total: number }>([
        {
          $match: {
            $or: [
              {
                paymentMethod: PaymentMethodEnum.CARD,
                status: {
                  $in: [
                    OrderStatusEnum.PAID,
                    OrderStatusEnum.CONFIRMED,
                    OrderStatusEnum.SHIPPED,
                    OrderStatusEnum.DELIVERED,
                  ],
                },
              },
              {
                paymentMethod: PaymentMethodEnum.CASH,
                status: OrderStatusEnum.DELIVERED,
              },
            ],
          },
        },
        { $group: { _id: null, total: { $sum: '$finalTotal' } } },
      ]),
      this._productModel.countDocuments({ stock: { $gt: 0, $lte: 5 } }),
      this._productModel.countDocuments({ stock: 0 }),
    ]);

    const orders: Record<string, number> = {};
    let totalOrders = 0;
    for (const row of byStatus) {
      orders[row._id] = row.count;
      totalOrders += row.count;
    }

    return {
      totalOrders,
      orders,
      revenue: revenueAgg[0]?.total ?? 0,
      lowStock,
      outOfStock,
    };
  }

  async updateStatusByAdmin(orderId: Types.ObjectId, status: OrderStatusEnum) {
    this.assertValidId(orderId);

    const order = await this._orderModel.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order Not Found');
    }

    const allowed = ADMIN_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(status)) {
      throw new BadRequestException('Invalid status transition');
    }

    if (status === OrderStatusEnum.CANCELLED) {
      await this.cancelByAdmin(order);
    } else {
      if (
        order.status === OrderStatusEnum.PENDING &&
        order.paymentMethod === PaymentMethodEnum.CARD
      ) {
        throw new BadRequestException('Card order must be paid first');
      }

      // الشرط على الحالة القديمة بيمنع سباق مع الـ webhook أو أدمن تاني
      const updated = await this._orderModel.findOneAndUpdate(
        { _id: order._id, status: order.status },
        { status },
      );
      if (!updated) {
        throw new ConflictException('Order status has changed, please refresh');
      }
    }

    return this._orderModel
      .findById(orderId)
      .select('-intentId -sessionId -refundId -__v')
      .populate('user', 'firstName lastName email')
      .populate('items.product', 'title image price')
      .populate('appliedCoupon', 'code discountPercentage')
      .lean();
  }

  private async cancelByAdmin(order: HOrderDocument) {
    if (order.paymentMethod === PaymentMethodEnum.CARD) {
      // طلب بطاقة لسه ما اتدفعش: نقفل جلسة الدفع ونلغي
      if (order.status === OrderStatusEnum.PENDING) {
        if (order.sessionId) {
          const session = await this.paymentService.retrieveCheckoutSession(
            order.sessionId,
          );
          if (session.status === 'complete') {
            throw new BadRequestException('This order has already been paid');
          }
          if (session.status === 'open') {
            await this.paymentService.expireCheckoutSession(session.id);
          }
        }
        await this.cancelPendingOrder(order._id);
        return;
      }

      // طلب بطاقة مدفوع: استرداد
      if (!order.intentId) {
        throw new BadRequestException('no payment intent found for this order');
      }

      const refund = await this.paymentService.createRefund(order.intentId);

      const refunded = await this._orderModel.findOneAndUpdate(
        {
          _id: order._id,
          status: { $in: [OrderStatusEnum.PAID, OrderStatusEnum.CONFIRMED] },
        },
        {
          status: OrderStatusEnum.CANCELLED,
          refundId: refund.id,
          refundedAt: new Date(),
          $unset: { intentId: true },
        },
      );
      if (refunded) {
        await this.restoreOrderResources(refunded);
      }
      return;
    }

    // كاش
    const cancelled = await this._orderModel.findOneAndUpdate(
      { _id: order._id, status: order.status },
      { status: OrderStatusEnum.CANCELLED },
    );
    if (!cancelled) {
      throw new ConflictException('Order status has changed, please refresh');
    }
    await this.restoreOrderResources(cancelled);
  }

  async findMyOrder(orderId: Types.ObjectId, userId: Types.ObjectId) {
    this.assertValidId(orderId);

    const order = await this._orderModel
      .findOne({ _id: orderId, user: userId })
      .select('-intentId -sessionId -refundId -__v')
      .populate('items.product', 'title image price')
      .populate('appliedCoupon', 'code discountPercentage')
      .lean();

    if (!order) {
      throw new NotFoundException('Order Not Found');
    }

    return order;
  }

  // ───────────── الدفع ─────────────

  async createCheckoutSession(
    orderId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<Stripe.Response<Stripe.Checkout.Session>> {
    this.assertValidId(orderId);

    const order = await this._orderModel
      .findOne({
        _id: orderId,
        user: userId,
        status: OrderStatusEnum.PENDING,
        paymentMethod: PaymentMethodEnum.CARD,
      })
      .populate([{ path: 'user' }, { path: 'appliedCoupon' }]);

    if (!order) {
      throw new NotFoundException('Order Not Found');
    }

    // لو فيه جلسة دفع قديمة: لو اتدفعت نوقف، ولو لسه مفتوحة نقفلها بعد ما نعمل الجديدة
    const previousSession = order.sessionId
      ? await this.paymentService.retrieveCheckoutSession(order.sessionId)
      : null;

    if (previousSession?.status === 'complete') {
      throw new BadRequestException('This order has already been paid');
    }

    const user = order.user as unknown as HUserDocument;
    const amount = order.subTotal ?? 0;

    const line_items = [
      {
        price_data: {
          currency: 'egp',
          product_data: {
            name: `Order ${user.firstName}`,
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
      customer_email: user.email,
      line_items,
      mode: 'payment',
      discounts,
      metadata: { orderId: order._id.toString() },
    });

    // الجلسة الجديدة بتتسجّل الأول، وبعدها نقفل القديمة
    await this._orderModel.updateOne(
      { _id: order._id },
      { sessionId: session.id },
    );

    if (previousSession?.status === 'open') {
      try {
        await this.paymentService.expireCheckoutSession(previousSession.id);
      } catch {
        // الجلسة القديمة اتقفلت أو انتهت بالفعل
      }
    }

    return session;
  }

  // ───────────── إلغاء واسترداد ─────────────

  async cancelOrder(orderId: Types.ObjectId, userId: Types.ObjectId) {
    this.assertValidId(orderId);

    const order = await this._orderModel.findOne({
      _id: orderId,
      user: userId,
    });

    if (!order) {
      throw new NotFoundException('Order Not Found');
    }

    if (order.status !== OrderStatusEnum.PENDING) {
      throw new BadRequestException('Only pending orders can be cancelled');
    }

    if (order.sessionId) {
      const session = await this.paymentService.retrieveCheckoutSession(
        order.sessionId,
      );

      if (session.status === 'complete') {
        throw new BadRequestException('This order has already been paid');
      }

      if (session.status === 'open') {
        await this.paymentService.expireCheckoutSession(session.id);
      }
    }

    await this.cancelPendingOrder(order._id);

    return this.findMyOrder(orderId, userId);
  }

  async refundOrder(orderId: Types.ObjectId, userId: Types.ObjectId) {
    this.assertValidId(orderId);

    const order = await this._orderModel.findOne({
      _id: orderId,
      user: userId,
      paymentMethod: PaymentMethodEnum.CARD,
      status: OrderStatusEnum.PAID,
    });

    if (!order) {
      throw new NotFoundException('Order Not Found');
    }

    if (!order.intentId) {
      throw new BadRequestException('no payment intent found for this order');
    }

    const refund = await this.paymentService.createRefund(order.intentId);

    const refundedOrder = await this._orderModel.findOneAndUpdate(
      { _id: orderId, status: OrderStatusEnum.PAID },
      {
        status: OrderStatusEnum.CANCELLED,
        refundId: refund.id,
        refundedAt: new Date(),
        $unset: { intentId: true },
      },
      { returnDocument: 'after' },
    );

    await this.restoreOrderResources(order);

    return refundedOrder;
  }

  // ───────────── Stripe webhook ─────────────

  async handleStripeEvent(event: Stripe.Event) {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.payment_status === 'paid') {
          await this.markOrderAsPaid(session);
        }
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object;
        const orderId = session.metadata?.orderId;

        if (orderId && isValidObjectId(orderId)) {
          // بنلغي الطلب بس لو دي جلسته الحالية، علشان جلسة قديمة اتقفلت ما تلغيش طلب لسه بيتدفع
          await this.cancelPendingOrder(orderId, session.id);
        }
        break;
      }

      default:
        break;
    }
  }

  private async markOrderAsPaid(session: Stripe.Checkout.Session) {
    const orderId = session.metadata?.orderId;
    if (!orderId || !isValidObjectId(orderId)) return;

    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id;

    // التحديث الذري بيخلي تكرار الحدث من Stripe بلا تأثير
    const order = await this._orderModel.findOneAndUpdate(
      { _id: orderId, status: OrderStatusEnum.PENDING },
      { status: OrderStatusEnum.PAID, intentId: paymentIntentId },
    );

    if (!order) {
      console.warn(
        `Stripe webhook: order ${orderId} was not pending, payment not applied`,
      );
    }
  }

  private async cancelPendingOrder(
    orderId: Types.ObjectId | string,
    sessionId?: string,
  ) {
    const order = await this._orderModel.findOneAndUpdate(
      {
        _id: orderId,
        status: OrderStatusEnum.PENDING,
        ...(sessionId ? { sessionId } : {}),
      },
      { status: OrderStatusEnum.CANCELLED },
    );

    // لو الطلب مش PENDING (اتلغى قبل كده) مش هنرجّع المخزون مرتين
    if (order) {
      await this.restoreOrderResources(order);
    }

    return order;
  }

  private async restoreOrderResources(order: HOrderDocument) {
    for (const item of order.items) {
      await this.adjustStock(item, item.quantity);
    }

    await this._cache.invalidateProducts();

    if (order.appliedCoupon) {
      await this._couponModel.updateOne(
        { _id: order.appliedCoupon, usedCount: { $gt: 0 } },
        { $inc: { usedCount: -1 }, $pull: { usedBy: order.user } },
      );
    }
  }
}
