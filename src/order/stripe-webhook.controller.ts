import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import type Stripe from 'stripe';
import { OrderService } from './order.service.js';
import { PaymentService } from '../common/ServicesPayment/payment/payment.service.js';

@Controller('stripe')
export class StripeWebhookController {
  constructor(
    private readonly orderService: OrderService,
    private readonly paymentService: PaymentService,
  ) {}

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature || !req.rawBody) {
      throw new BadRequestException('Missing Stripe signature or body');
    }

    let event: Stripe.Event;

    try {
      event = this.paymentService.constructWebhookEvent(req.rawBody, signature);
    } catch {
      throw new BadRequestException('Invalid Stripe signature');
    }

    await this.orderService.handleStripeEvent(event);

    return { received: true };
  }
}
