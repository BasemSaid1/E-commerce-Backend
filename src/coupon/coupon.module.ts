import { Module } from '@nestjs/common';
import { CouponService } from './coupon.service.js';
import { CouponController } from './coupon.controller.js';
import { CouponModel } from '../DB/models/coupon.model.js';
import { UserModel } from '../DB/models/user.model.js';
import { TokenService } from '../common/service/token.service.js';
import { JwtService } from '@nestjs/jwt';
import { CouponResolver } from './gql-schema/coupon.resolver.js';

@Module({
  imports: [UserModel, CouponModel],
  controllers: [CouponController],
  providers: [CouponService, TokenService, JwtService, CouponResolver],
})
export class CouponModule {}
