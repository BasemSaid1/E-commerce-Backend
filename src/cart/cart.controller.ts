import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CartService } from './cart.service.js';
import { AuthGuard } from '../common/guards/auth.guard.js';
import type { Request } from 'express';
import { AddToCartDto } from './dto/create-cart.dto.js';
import { Types } from 'mongoose';
import { UpdateCartItemDto } from './dto/update-cart.dto.js';

@Controller('cart')
@UseGuards(AuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post('add')
  async addToCart(@Req() req: Request, @Body() addToCartDto: AddToCartDto) {
    const userId = req.user!._id as unknown as string;
    return this.cartService.addToCart(userId, addToCartDto);
  }

  @Get()
  async getCart(@Req() req: Request) {
    const userId = req.user!._id as unknown as string;
    return this.cartService.getCart(userId);
  }

  @Delete('item/:productId')
  async removeItem(
    @Req() req: Request,
    @Param('productId') productId: string,
    @Query('variantId') variantId?: string,
  ) {
    const userId = req.user!._id as unknown as string;
    return this.cartService.removeItem(userId, productId, variantId);
  }

  @Patch('item/:productId')
  updateCartItem(
    @Req() req: Request,
    @Param('productId') productId: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
    @Query('variantId') variantId?: string,
  ) {
    const userId = req.user!._id as unknown as string;

    return this.cartService.updateCartItem(
      userId,
      productId,
      updateCartItemDto,
      variantId,
    );
  }
}
