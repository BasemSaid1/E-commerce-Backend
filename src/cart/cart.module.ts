import { Module } from '@nestjs/common';
import { CartService } from './cart.service.js';
import { CartController } from './cart.controller.js';
import { UserModel } from '../DB/models/user.model.js';
import { CartModel } from '../DB/models/cart.model.js';
import { ProductModel } from '../DB/models/product.model.js';
import { TokenService } from '../common/service/token.service.js';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [UserModel, CartModel, ProductModel],
  controllers: [CartController],
  providers: [CartService, TokenService, JwtService],
})
export class CartModule {}
