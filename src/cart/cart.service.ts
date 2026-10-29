import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AddToCartDto } from './dto/create-cart.dto.js';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Cart, HCartDocument } from '../DB/models/cart.model.js';
import { HProductDocument, Product } from '../DB/models/product.model.js';
import { CartAction, UpdateCartItemDto } from './dto/update-cart.dto.js';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private readonly _cartModel: Model<HCartDocument>,
    @InjectModel(Product.name)
    private readonly _productModel: Model<HProductDocument>,
  ) {}

  private recalculateCartTotal(cart: HCartDocument): void {
    let total = 0;
    for (const item of cart.items) {
      item.subTotal = item.quantity * item.pricePerUnit;
      total += item.subTotal;
    }
    cart.totalPrice = total;
  }

  async addToCart(
    userId: string,
    addToCartDto: AddToCartDto,
  ): Promise<HCartDocument> {
    const { productId, quantity } = addToCartDto;

    const product = await this._productModel.findById(productId);
    if (!product) {
      throw new NotFoundException('product not found');
    }
    if (product.stock < quantity) {
      throw new BadRequestException(
        `insuffecent stock. only ${product.stock} units available `,
      );
    }

    let cart = await this._cartModel.findOne({ user: userId });
    if (!cart) {
      cart = new this._cartModel({ user: userId, items: [] });
    }

    const exsistingItemsIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId,
    );

    if (exsistingItemsIndex > -1) {
      const targetNewQuantity =
        cart.items[exsistingItemsIndex].quantity + quantity;

      if (product.stock < targetNewQuantity) {
        throw new BadRequestException(
          `cannot add. combined cart total ${targetNewQuantity} exceeds available stock ${product.stock}`,
        );
      }

      cart.items[exsistingItemsIndex].quantity = targetNewQuantity;
    } else {
      cart.items.push({
        product: productId,
        quantity,
        pricePerUnit: product.price,
        subTotal: quantity * product.price,
      });
    }

    this.recalculateCartTotal(cart);
    return (await cart.save()).populate('items.product');
  }

  async getCart(userId: string) {
    let cart = await this._cartModel
      .findOne({ user: userId })
      .populate('items.product');
    if (!cart) {
      cart = new this._cartModel({ user: userId, items: [] });
      await cart.save();
    }
    return cart;
  }

  async removeItem(userId: string, productId: string) {
    const cart = await this._cartModel.findOne({
      user: userId,
    });

    if (!cart) {
      throw new NotFoundException('Cart not found for this user');
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId,
    );

    if (itemIndex === -1) {
      throw new NotFoundException('Product not found in cart');
    }

    cart.items.splice(itemIndex, 1);

    this.recalculateCartTotal(cart);

    return (await cart.save()).populate('items.product');
  }

  async updateCartItem(
    userId: string,
    productId: string,
    updateCartItemDto: UpdateCartItemDto,
  ) {
    const cart = await this._cartModel.findOne({
      user: userId,
    });

    if (!cart) {
      throw new NotFoundException('Cart not found for this user');
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId,
    );

    if (itemIndex === -1) {
      throw new NotFoundException('Product not found in cart');
    }

    const item = cart.items[itemIndex];

    if (updateCartItemDto.action === CartAction.INCREASE) {
      const product = await this._productModel.findById(productId);

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      if (item.quantity >= product.stock) {
        throw new BadRequestException(
          `Cannot increase quantity. Only ${product.stock} units available`,
        );
      }

      item.quantity += 1;
    }

    if (updateCartItemDto.action === CartAction.DECREASE) {
      if (item.quantity === 1) {
        cart.items.splice(itemIndex, 1);
      } else {
        item.quantity -= 1;
      }
    }

    this.recalculateCartTotal(cart);

    return (await cart.save()).populate('items.product');
  }
}
