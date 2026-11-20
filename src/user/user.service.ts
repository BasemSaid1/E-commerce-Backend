import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { HUserDocument, User } from '../DB/models/user.model.js';
import { RoleEnum } from '../common/enums/user.enum.js';
import { HOrderDocument, Order } from '../DB/models/order.model.js';
import { HCartDocument, Cart } from '../DB/models/cart.model.js';
import { HReviewDocument, Review } from '../DB/models/review.model.js';
import { deleteImageByUrl } from '../common/utils/cloudinary.util.js';

interface AdminUsersQuery {
  page: number;
  limit: number;
  search?: string;
  role?: string;
  verified?: string;
}

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly _userModel: Model<HUserDocument>,
    @InjectModel(Order.name)
    private readonly _orderModel: Model<HOrderDocument>,
    @InjectModel(Cart.name) private readonly _cartModel: Model<HCartDocument>,
    @InjectModel(Review.name)
    private readonly _reviewModel: Model<HReviewDocument>,
  ) {}

  async findAllForAdmin(query: AdminUsersQuery) {
    const page =
      Number.isInteger(query.page) && query.page > 0 ? query.page : 1;
    const limit =
      Number.isInteger(query.limit) && query.limit > 0
        ? Math.min(query.limit, 50)
        : 10;

    const filter: Record<string, unknown> = {};

    if (query.role) {
      if (!Object.values(RoleEnum).includes(query.role as RoleEnum)) {
        throw new BadRequestException('Invalid role');
      }
      filter.role = query.role;
    }

    if (query.verified === 'true') {
      filter.confirmEmail = { $exists: true, $ne: null };
    } else if (query.verified === 'false') {
      filter.$or = [
        { confirmEmail: { $exists: false } },
        { confirmEmail: null },
      ];
    } else if (query.verified) {
      throw new BadRequestException('verified must be true or false');
    }

    const search = query.search?.trim().slice(0, 50);
    if (search) {
      const pattern = new RegExp(
        search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'i',
      );
      const searchFilter = [
        { firstName: pattern },
        { lastName: pattern },
        { email: pattern },
      ];
      // لو فيه $or بالفعل (فلتر التفعيل) بنجمعهم بـ $and
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchFilter }];
        delete filter.$or;
      } else {
        filter.$or = searchFilter;
      }
    }

    const [users, total, allUsers, verifiedUsers, admins] = await Promise.all([
      this._userModel
        .find(filter)
        .select(
          '-password -confirmEmailOTP -otpExpiresAt -forgetPasswordOTP -forgetPasswordOTPExpiresAt -__v',
        )
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this._userModel.countDocuments(filter),
      this._userModel.countDocuments({}),
      this._userModel.countDocuments({
        confirmEmail: { $exists: true, $ne: null },
      }),
      this._userModel.countDocuments({ role: RoleEnum.ADMIN }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      users,
      summary: {
        total: allUsers,
        verified: verifiedUsers,
        unverified: allUsers - verifiedUsers,
        admins,
      },
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async remove(id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid user id');
    }

    const user = await this._userModel.findById(id).select('role profilePic');
    if (!user) {
      throw new NotFoundException('User account not found');
    }

    if (user.role === RoleEnum.ADMIN) {
      throw new ForbiddenException('Admin accounts cannot be deleted');
    }

    // نحافظ على سجل الطلبات: الحساب اللي ليه طلبات ما يتمسحش
    const hasOrders = await this._orderModel.exists({ user: user._id });
    if (hasOrders) {
      throw new ConflictException('This user has orders and cannot be deleted');
    }

    await Promise.all([
      this._cartModel.deleteMany({ user: user._id }),
      this._reviewModel.deleteMany({ user: user._id }),
    ]);
    await this._userModel.deleteOne({ _id: user._id });
    await deleteImageByUrl(user.profilePic);

    return { message: 'User deleted successfully' };
  }
}
