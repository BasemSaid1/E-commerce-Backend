import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Req,
  UseGuards,
  Param,
  Query,
} from '@nestjs/common';
import { OrderService } from './order.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import type { Request } from 'express';
import { Types } from 'mongoose';
import { AuthGuard } from '../common/guards/auth.guard.js';
import Stripe from 'stripe';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';
import { RoleGuard } from '../common/guards/role.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RoleEnum } from '../common/enums/user.enum.js';

@Controller('order')
@UseGuards(AuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  findMyOrders(@Req() req: Request) {
    const userId = req.user?._id as unknown as Types.ObjectId;
    return this.orderService.findMyOrders(userId);
  }

  @Get('admin/list')
  @UseGuards(RoleGuard)
  @Roles(RoleEnum.ADMIN)
  findAllForAdmin(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.orderService.findAllForAdmin({
      page: Number(page),
      limit: Number(limit),
      status,
    });
  }

  @Patch('admin/:orderId/status')
  @UseGuards(RoleGuard)
  @Roles(RoleEnum.ADMIN)
  updateStatusByAdmin(
    @Param('orderId') orderId: Types.ObjectId,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.orderService.updateStatusByAdmin(orderId, dto.status);
  }

  @Get(':orderId')
  findMyOrder(@Param('orderId') orderId: Types.ObjectId, @Req() req: Request) {
    const userId = req.user?._id as unknown as Types.ObjectId;
    return this.orderService.findMyOrder(orderId, userId);
  }

  @Patch(':orderId/cancel')
  cancelOrder(@Param('orderId') orderId: Types.ObjectId, @Req() req: Request) {
    const userId = req.user?._id as unknown as Types.ObjectId;
    return this.orderService.cancelOrder(orderId, userId);
  }

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
