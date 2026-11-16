import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCouponDto } from './dto/create-coupon.dto.js';
import { UpdateCouponDto } from './dto/update-coupon.dto.js';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Coupon, HCouponDocument } from '../DB/models/coupon.model.js';

@Injectable()
export class CouponService {
  constructor(
    @InjectModel(Coupon.name)
    private readonly _couponModel: Model<HCouponDocument>,
  ) {}

  async create(createCouponDto: CreateCouponDto, adminId: Types.ObjectId) {
    const cleanCode = createCouponDto.code.toUpperCase().trim();

    const existing = await this._couponModel.exists({ code: cleanCode });
    if (existing) {
      throw new ConflictException('Coupon code already exists');
    }

    const newCoupon = new this._couponModel({
      ...createCouponDto,
      code: cleanCode,
      createdBy: adminId,
    });

    return (await newCoupon.save()).populate(
      'createdBy',
      'firstName lastName email',
    );
  }

  async validateCoupon(code: string, userId: Types.ObjectId) {
    const cleanCode = code.toUpperCase().trim();
    const coupon = await this._couponModel.findOne({ code: cleanCode });
    if (!coupon) {
      throw new NotFoundException('Oops! Coupon is invalid or expired');
    }

    if (coupon.expiryDate <= new Date()) {
      throw new BadRequestException('Oops! Coupon is invalid or expired');
    }

    if (coupon.usedCount >= coupon.maxUsageCount) {
      throw new BadRequestException('Oops! Coupon is invalid or expired');
    }

    // const hasUsed = coupon.usedBy.includes(userId);
    const hasUsed = coupon.usedBy.some(
      (id) => id.toString() === userId.toString(),
    );

    if (hasUsed) {
      throw new BadRequestException('Oops! Coupon is invalid or expired');
    }

    return coupon;
  }

  findAll() {
    return this._couponModel
      .find()
      .populate('createdBy', 'firstName lastName email')
      .lean();
  }

  async update(id: Types.ObjectId, updateCouponDto: UpdateCouponDto) {
    const updatedCoupon = await this._couponModel.findByIdAndUpdate(
      id,
      updateCouponDto,
      { returnDocument: 'after' },
    );
    if (!updatedCoupon) {
      throw new NotFoundException('Coupon not found');
    }
    return updatedCoupon?.populate('createdBy', 'firstName lastName email');
  }
}
