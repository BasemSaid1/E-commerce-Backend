import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CouponService } from './coupon.service.js';
import { CreateCouponDto } from './dto/create-coupon.dto.js';
import { UpdateCouponDto } from './dto/update-coupon.dto.js';
import type { Request } from 'express';
import { RoleGuard } from '../common/guards/role.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RoleEnum } from '../common/enums/user.enum.js';
import { Types } from 'mongoose';
import { AuthGuard } from '../common/guards/auth.guard.js';

@Controller('coupon')
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  @Post()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(RoleEnum.ADMIN)
  create(@Body() createCouponDto: CreateCouponDto, @Req() req: Request) {
    const adminId = req.user?._id as unknown as Types.ObjectId;

    return this.couponService.create(createCouponDto, adminId);
  }

  @Post('validate')
  @UseGuards(AuthGuard)
  validateCoupon(@Body('code') code: string, @Req() req: Request) {
    const userId = req.user?._id as unknown as Types.ObjectId;
    return this.couponService.validateCoupon(code, userId);
  }

  @Get()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(RoleEnum.ADMIN)
  findAll() {
    return this.couponService.findAll();
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(RoleEnum.ADMIN)
  update(
    @Param('id') id: Types.ObjectId,
    @Body() updateCouponDto: UpdateCouponDto,
  ) {
    return this.couponService.update(id, updateCouponDto);
  }
}
