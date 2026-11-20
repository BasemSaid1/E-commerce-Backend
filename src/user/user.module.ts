import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from './user.service.js';
import { UserController } from './user.controller.js';
import { UserModel } from '../DB/models/user.model.js';
import { OrderModel } from '../DB/models/order.model.js';
import { CartModel } from '../DB/models/cart.model.js';
import { ReviewModel } from '../DB/models/review.model.js';
import { TokenService } from '../common/service/token.service.js';

@Module({
  imports: [UserModel, OrderModel, CartModel, ReviewModel],
  controllers: [UserController],
  providers: [UserService, TokenService, JwtService],
})
export class UserModule {}
