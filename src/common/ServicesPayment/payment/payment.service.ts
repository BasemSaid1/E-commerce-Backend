import { BadRequestException, Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class PaymentService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
  }

  // create session checkout
  async checkoutSession({
    success_url = process.env.SUCCESS_URL as string,
    cancel_url = process.env.CANCEL_URL as string,
    mode = 'payment',
    discounts = [],
    metadata = {},
    line_items,
    customer_email,
  }: Stripe.Checkout.SessionCreateParams) {
    const session = await this.stripe.checkout.sessions.create({
      customer_email,
      success_url,
      cancel_url,
      line_items,
      mode,
      discounts,
      metadata,
    });

    return session;
  }

  async createCoupon(data: Stripe.CouponCreateParams) {
    const coupon = await this.stripe.coupons.create(data);
    return coupon;
  }

  async createPaymentMethod(data: Stripe.PaymentMethodCreateParams) {
    const method = await this.stripe.paymentMethods.create(data);
    return method;
  }

  async createPaymentIntent(data: Stripe.PaymentIntentCreateParams) {
    const intent = await this.stripe.paymentIntents.create(data);
    return intent;
  }

  async retrievePaymentIntents(id: string) {
    const intent = await this.stripe.paymentIntents.retrieve(id);
    return intent;
  }

  async confirmPaymentIntent(id: string) {
    const intent = await this.retrievePaymentIntents(id);
    if (!intent) {
      throw new BadRequestException('Invalid Payment Intent ID');
    }

    const confirmIntent = await this.stripe.paymentIntents.confirm(id);
    return confirmIntent;
  }

  async createRefund(id: string) {
    const intent = await this.retrievePaymentIntents(id);
    if (!intent) {
      throw new BadRequestException('Invalid Payment Intent ID');
    }

    const refund = await this.stripe.refunds.create({
      payment_intent: id,
    });
    return refund;
  }
}
