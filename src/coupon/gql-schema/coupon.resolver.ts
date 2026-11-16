import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Coupon } from './coupon.schema.js';
import { CouponService } from '../coupon.service.js';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { CreateCouponDto } from './dto/create-coupon.input.js';

@Resolver(() => Coupon)
export class CouponResolver {
  constructor(private readonly couponService: CouponService) {}

  @Query(() => [Coupon], { name: 'getCoupons' })
  async findAll() {
    return this.couponService.findAll();
  }

  @Mutation(() => Coupon, { name: 'createCoupon' })
  @UseGuards(AuthGuard)
  async createCoupon(
    @Args('input') input: CreateCouponDto,
    @Context() context: any,
  ) {
    const adminId = context.req.user._id;
    const doc = await this.couponService.create(input, adminId);
    return doc.toObject();
  }
}
