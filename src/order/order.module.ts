import { Module } from '@nestjs/common';
import { OrderService } from './order.service.js';
import { OrderController } from './order.controller.js';
import { OrderModel } from '../DB/models/order.model.js';
import { CartModel } from '../DB/models/cart.model.js';
import { ProductModel } from '../DB/models/product.model.js';
import { CouponModel } from '../DB/models/coupon.model.js';
import { UserModel } from '../DB/models/user.model.js';
import { TokenService } from '../common/service/token.service.js';
import { JwtService } from '@nestjs/jwt';
import { PaymentService } from '../common/ServicesPayment/payment/payment.service.js';

@Module({
  imports: [OrderModel, CartModel, ProductModel, CouponModel, UserModel],
  controllers: [OrderController],
  providers: [OrderService, TokenService, JwtService, PaymentService],
})
export class OrderModule {}
