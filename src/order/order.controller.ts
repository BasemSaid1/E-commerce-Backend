import { Controller, Post, Body, Req, UseGuards, Param } from '@nestjs/common';
import { OrderService } from './order.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import type { Request } from 'express';
import { Types } from 'mongoose';
import { AuthGuard } from '../common/guards/auth.guard.js';
import Stripe from 'stripe';

@Controller('order')
@UseGuards(AuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post('checkout')
  createOrder(@Body() createOrderDto: CreateOrderDto, @Req() req: Request) {
    const userId = req.user?._id as unknown as Types.ObjectId;
    return this.orderService.createOrder(createOrderDto, userId);
  }

  // create session
  @Post('checkout/:orderId')
  async createCheckoutSession(
    @Param('orderId') orderId: Types.ObjectId,
    @Req() req: Request,
  ): Promise<Stripe.Response<Stripe.Checkout.Session>> {
    const userId = req.user?._id as unknown as Types.ObjectId;
    const session = await this.orderService.createCheckoutSession(
      orderId,
      userId,
    );

    return session;
  }

  @Post('refund/:orderId')
  async refundOrder(
    @Param('orderId') orderId: Types.ObjectId,
    @Req() req: Request,
  ) {
    const userId = req.user?._id as unknown as Types.ObjectId;
    return this.orderService.refundOrder(orderId, userId);
  }
}
