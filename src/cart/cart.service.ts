import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AddToCartDto } from './dto/create-cart.dto.js';
import { isValidObjectId, Model, Types } from 'mongoose';
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

  private assertValidVariantId(variantId?: string) {
    if (variantId !== undefined && !isValidObjectId(variantId)) {
      throw new BadRequestException('invalid variant id');
    }
  }

  private findItemIndex(
    cart: HCartDocument,
    productId: string,
    variantId?: string,
  ) {
    return cart.items.findIndex(
      (item) =>
        item.product.toString() === productId &&
        (item.variantId?.toString() ?? '') === (variantId ?? ''),
    );
  }

  async addToCart(
    userId: string,
    addToCartDto: AddToCartDto,
  ): Promise<HCartDocument> {
    const { productId, variantId, quantity } = addToCartDto;

    const product = await this._productModel.findById(productId);
    if (!product) {
      throw new NotFoundException('product not found');
    }

    // السعر والمخزون من التركيبة المختارة لو المنتج له متغيّرات
    let unitPrice = product.price;
    let availableStock = product.stock;
    let variantLabel: string | undefined;

    if (product.variants?.length > 0) {
      if (!variantId) {
        throw new BadRequestException('please select the product options');
      }
      const variant = product.variants.find(
        (v) => v._id.toString() === variantId,
      );
      if (!variant) {
        throw new BadRequestException('selected option is not available');
      }
      unitPrice = variant.price;
      availableStock = variant.stock;
      variantLabel = variant.attributes
        .map((a) => `${a.name}: ${a.value}`)
        .join(' • ');
    } else if (variantId) {
      throw new BadRequestException('this product has no options');
    }

    if (availableStock < quantity) {
      throw new BadRequestException(
        `insuffecent stock. only ${availableStock} units available `,
      );
    }

    let cart = await this._cartModel.findOne({ user: userId });
    if (!cart) {
      cart = new this._cartModel({ user: userId, items: [] });
    }

    const exsistingItemsIndex = this.findItemIndex(cart, productId, variantId);

    if (exsistingItemsIndex > -1) {
      const targetNewQuantity =
        cart.items[exsistingItemsIndex].quantity + quantity;

      if (availableStock < targetNewQuantity) {
        throw new BadRequestException(
          `cannot add. combined cart total ${targetNewQuantity} exceeds available stock ${availableStock}`,
        );
      }

      cart.items[exsistingItemsIndex].quantity = targetNewQuantity;
      cart.items[exsistingItemsIndex].pricePerUnit = unitPrice;
    } else {
      cart.items.push({
        product: productId,
        ...(variantId
          ? { variantId: new Types.ObjectId(variantId), variantLabel }
          : {}),
        quantity,
        pricePerUnit: unitPrice,
        subTotal: quantity * unitPrice,
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

  async removeItem(userId: string, productId: string, variantId?: string) {
    this.assertValidVariantId(variantId);

    const cart = await this._cartModel.findOne({
      user: userId,
    });

    if (!cart) {
      throw new NotFoundException('Cart not found for this user');
    }

    const itemIndex = this.findItemIndex(cart, productId, variantId);

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
    variantId?: string,
  ) {
    this.assertValidVariantId(variantId);

    const cart = await this._cartModel.findOne({
      user: userId,
    });

    if (!cart) {
      throw new NotFoundException('Cart not found for this user');
    }

    const itemIndex = this.findItemIndex(cart, productId, variantId);

    if (itemIndex === -1) {
      throw new NotFoundException('Product not found in cart');
    }

    const item = cart.items[itemIndex];

    if (updateCartItemDto.action === CartAction.INCREASE) {
      const product = await this._productModel.findById(productId);

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      let availableStock = product.stock;

      if (product.variants?.length > 0) {
        const variant = item.variantId
          ? product.variants.find(
              (v) => v._id.toString() === item.variantId!.toString(),
            )
          : undefined;
        if (!variant) {
          throw new BadRequestException('selected option is not available');
        }
        availableStock = variant.stock;
      }

      if (item.quantity >= availableStock) {
        throw new BadRequestException(
          `Cannot increase quantity. Only ${availableStock} units available`,
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
